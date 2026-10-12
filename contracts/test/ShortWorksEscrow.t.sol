// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ShortWorksEscrow} from "../src/ShortWorksEscrow.sol";

// USDC stand-in: 6 decimals, EIP-2612 permit.
contract MockUSDC is ERC20Permit {
    constructor() ERC20("USDC", "USDC") ERC20Permit("USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ShortWorksEscrowTest is Test {
    MockUSDC usdc;
    ShortWorksEscrow escrow;

    address admin = makeAddr("admin");
    address operator = makeAddr("operator");
    address treasury = makeAddr("treasury");
    address freelancer = makeAddr("freelancer");
    address stranger = makeAddr("stranger");
    uint256 signerKey = 0xA11CE;
    uint256 clientKey = 0xC11E27;
    address signer;
    address client;

    uint128 constant AMOUNT = 100e6; // 100 USDC
    uint128 constant FEE = 10e6; // 10%
    uint256 constant JOB = 42;

    function setUp() public {
        vm.warp(1_800_000_000);
        signer = vm.addr(signerKey);
        client = vm.addr(clientKey);
        usdc = new MockUSDC();
        escrow = new ShortWorksEscrow(usdc, admin, operator, signer, treasury);
        usdc.mint(client, 1_000e6);
    }

    // ---- helpers -------------------------------------------------------------------

    function terms() internal view returns (ShortWorksEscrow.Terms memory) {
        return ShortWorksEscrow.Terms({
            jobId: JOB,
            client: client,
            freelancer: freelancer,
            amount: AMOUNT,
            fee: FEE,
            expiresAt: uint64(block.timestamp + 30 days),
            signatureDeadline: uint64(block.timestamp + 30 minutes)
        });
    }

    function sign(ShortWorksEscrow.Terms memory t, uint256 key) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, escrow.hashTerms(t));
        return abi.encodePacked(r, s, v);
    }

    function permitFor(uint256 amount) internal view returns (ShortWorksEscrow.Permit memory p) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                client,
                address(escrow),
                amount,
                usdc.nonces(client),
                block.timestamp + 1 hours
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash));
        (p.v, p.r, p.s) = vm.sign(clientKey, digest);
        p.deadline = block.timestamp + 1 hours;
    }

    function fundJob() internal returns (ShortWorksEscrow.Terms memory t) {
        t = terms();
        ShortWorksEscrow.Permit memory p = permitFor(t.amount);
        bytes memory sig = sign(t, signerKey);
        vm.prank(client);
        escrow.fundWithPermit(t, sig, p);
    }

    function status(uint256 jobId) internal view returns (ShortWorksEscrow.Status s) {
        (,, s,,,,,) = escrow.jobs(jobId);
    }

    function expiresAt(uint256 jobId) internal view returns (uint64 e) {
        (, e,,,,,,) = escrow.jobs(jobId);
    }

    // ---- funding -------------------------------------------------------------------

    function test_fundWithPermit_holdsMoney() public {
        vm.expectEmit(address(escrow));
        emit ShortWorksEscrow.Funded(JOB, client, freelancer, AMOUNT, FEE, uint64(block.timestamp + 30 days));
        fundJob();
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT);
        assertEq(usdc.balanceOf(client), 900e6);
        assertEq(uint8(status(JOB)), uint8(ShortWorksEscrow.Status.Funded));
    }

    function test_fund_withApprove() public {
        ShortWorksEscrow.Terms memory t = terms();
        bytes memory sig = sign(t, signerKey);
        vm.startPrank(client);
        usdc.approve(address(escrow), t.amount);
        escrow.fund(t, sig);
        vm.stopPrank();
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT);
    }

    function test_fundWithPermit_permitAlreadyUsed_stillFunds() public {
        ShortWorksEscrow.Terms memory t = terms();
        ShortWorksEscrow.Permit memory p = permitFor(t.amount);
        // Someone front-runs the permit; the allowance exists, so funding must still work.
        usdc.permit(client, address(escrow), t.amount, p.deadline, p.v, p.r, p.s);
        bytes memory sig = sign(t, signerKey);
        vm.prank(client);
        escrow.fundWithPermit(t, sig, p);
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT);
    }

    // A2: terms changed in the browser
    function test_fund_tamperedAmount_reverts() public {
        ShortWorksEscrow.Terms memory t = terms();
        bytes memory sig = sign(t, signerKey);
        t.amount = 1e6;
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.BadSignature.selector);
        escrow.fund(t, sig);
    }

    function test_fund_tamperedFreelancer_reverts() public {
        ShortWorksEscrow.Terms memory t = terms();
        bytes memory sig = sign(t, signerKey);
        t.freelancer = stranger;
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.BadSignature.selector);
        escrow.fund(t, sig);
    }

    function test_fund_wrongSigner_reverts() public {
        ShortWorksEscrow.Terms memory t = terms();
        bytes memory sig = sign(t, clientKey);
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.BadSignature.selector);
        escrow.fund(t, sig);
    }

    // A3: reuse, expired signature, another wallet
    function test_fund_twice_reverts() public {
        ShortWorksEscrow.Terms memory t = fundJob();
        bytes memory sig = sign(t, signerKey);
        vm.startPrank(client);
        usdc.approve(address(escrow), t.amount);
        vm.expectRevert(ShortWorksEscrow.AlreadyFunded.selector);
        escrow.fund(t, sig);
        vm.stopPrank();
    }

    function test_fund_expiredSignature_reverts() public {
        ShortWorksEscrow.Terms memory t = terms();
        bytes memory sig = sign(t, signerKey);
        vm.warp(t.signatureDeadline + 1);
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.SignatureExpired.selector);
        escrow.fund(t, sig);
    }

    function test_fund_otherWallet_reverts() public {
        ShortWorksEscrow.Terms memory t = terms();
        bytes memory sig = sign(t, signerKey);
        vm.prank(stranger);
        vm.expectRevert(ShortWorksEscrow.NotClient.selector);
        escrow.fund(t, sig);
    }

    function test_fund_feeOverCap_reverts() public {
        ShortWorksEscrow.Terms memory t = terms();
        t.fee = 21e6; // 21% > 20%
        bytes memory sig = sign(t, signerKey);
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.BadTerms.selector);
        escrow.fund(t, sig);
    }

    function test_fund_freelancerIsClient_reverts() public {
        ShortWorksEscrow.Terms memory t = terms();
        t.freelancer = client;
        bytes memory sig = sign(t, signerKey);
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.BadTerms.selector);
        escrow.fund(t, sig);
    }

    // ---- release -------------------------------------------------------------------

    // A4 (contract part)
    function test_release_byClient_paysFreelancerAndFee() public {
        fundJob();
        vm.prank(client);
        escrow.release(JOB);
        assertEq(usdc.balanceOf(freelancer), 90e6);
        assertEq(usdc.balanceOf(treasury), 10e6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(uint8(status(JOB)), uint8(ShortWorksEscrow.Status.Released));
    }

    function test_release_byOperator() public {
        fundJob();
        vm.prank(operator);
        escrow.release(JOB);
        assertEq(usdc.balanceOf(freelancer), 90e6);
    }

    function test_release_byStrangerOrFreelancer_reverts() public {
        fundJob();
        vm.prank(stranger);
        vm.expectRevert(ShortWorksEscrow.NotAllowed.selector);
        escrow.release(JOB);
        vm.prank(freelancer);
        vm.expectRevert(ShortWorksEscrow.NotAllowed.selector);
        escrow.release(JOB);
    }

    // A6
    function test_release_twice_reverts() public {
        fundJob();
        vm.prank(client);
        escrow.release(JOB);
        vm.prank(operator);
        vm.expectRevert(ShortWorksEscrow.NotFunded.selector);
        escrow.release(JOB);
        assertEq(usdc.balanceOf(freelancer), 90e6);
    }

    function test_feeGoesToTreasuryFixedAtFunding() public {
        fundJob();
        vm.prank(admin);
        escrow.setTreasury(stranger);
        vm.prank(operator);
        escrow.release(JOB);
        assertEq(usdc.balanceOf(treasury), 10e6);
        assertEq(usdc.balanceOf(stranger), 0);
    }

    // ---- refund / reclaim ----------------------------------------------------------

    // A5
    function test_refund_byOperator() public {
        fundJob();
        vm.prank(operator);
        escrow.refund(JOB);
        assertEq(usdc.balanceOf(client), 1_000e6);
        assertEq(uint8(status(JOB)), uint8(ShortWorksEscrow.Status.Refunded));
    }

    function test_refund_byFreelancer() public {
        fundJob();
        vm.prank(freelancer);
        escrow.refund(JOB);
        assertEq(usdc.balanceOf(client), 1_000e6);
    }

    function test_refund_byClient_reverts() public {
        fundJob();
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.NotAllowed.selector);
        escrow.refund(JOB);
    }

    function test_refundThenRelease_reverts() public {
        fundJob();
        vm.prank(operator);
        escrow.refund(JOB);
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.NotFunded.selector);
        escrow.release(JOB);
    }

    function test_reclaim_beforeExpiry_reverts() public {
        ShortWorksEscrow.Terms memory t = fundJob();
        vm.warp(t.expiresAt);
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.NotExpired.selector);
        escrow.reclaim(JOB);
    }

    function test_reclaim_afterExpiry() public {
        ShortWorksEscrow.Terms memory t = fundJob();
        vm.warp(t.expiresAt + 1);
        vm.expectEmit(address(escrow));
        emit ShortWorksEscrow.Refunded(JOB, AMOUNT, client);
        vm.prank(client);
        escrow.reclaim(JOB);
        assertEq(usdc.balanceOf(client), 1_000e6);
    }

    function test_reclaim_byOthers_reverts() public {
        ShortWorksEscrow.Terms memory t = fundJob();
        vm.warp(t.expiresAt + 1);
        vm.prank(operator);
        vm.expectRevert(ShortWorksEscrow.NotClient.selector);
        escrow.reclaim(JOB);
    }

    // ---- disputes ------------------------------------------------------------------

    // A7
    function test_frozen_blocksReclaim() public {
        ShortWorksEscrow.Terms memory t = fundJob();
        vm.prank(operator);
        escrow.setFrozen(JOB, true);
        vm.warp(t.expiresAt + 1);
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.IsFrozen.selector);
        escrow.reclaim(JOB);
        // ShortWorks decides: release still works while frozen.
        vm.prank(operator);
        escrow.release(JOB);
        assertEq(usdc.balanceOf(freelancer), 90e6);
    }

    function test_unfreeze_pushesExpiryBack() public {
        ShortWorksEscrow.Terms memory t = fundJob();
        vm.prank(operator);
        escrow.setFrozen(JOB, true);
        skip(5 days);
        vm.prank(operator);
        escrow.setFrozen(JOB, false);
        assertEq(expiresAt(JOB), t.expiresAt + 5 days);
        vm.warp(t.expiresAt + 1);
        vm.prank(client);
        vm.expectRevert(ShortWorksEscrow.NotExpired.selector);
        escrow.reclaim(JOB);
    }

    function test_setFrozen_onlyOperator() public {
        fundJob();
        bytes32 role = escrow.OPERATOR_ROLE();
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, client, role));
        escrow.setFrozen(JOB, true);
    }

    // ---- pause (A8) ------------------------------------------------------------------

    function test_pause_blocksFundOnly() public {
        fundJob();
        vm.prank(admin);
        escrow.pause();

        ShortWorksEscrow.Terms memory t = terms();
        t.jobId = JOB + 1;
        bytes memory sig = sign(t, signerKey);
        vm.startPrank(client);
        usdc.approve(address(escrow), t.amount);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.fund(t, sig);
        vm.stopPrank();

        vm.prank(client);
        escrow.release(JOB);
        assertEq(usdc.balanceOf(freelancer), 90e6);
    }

    function test_pause_onlyAdmin() public {
        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, operator, bytes32(0))
        );
        escrow.pause();
    }

    function test_setSigner_oldSignaturesStopWorking() public {
        ShortWorksEscrow.Terms memory t = terms();
        bytes memory sig = sign(t, signerKey);
        vm.prank(admin);
        escrow.setSigner(stranger);
        vm.startPrank(client);
        usdc.approve(address(escrow), t.amount);
        vm.expectRevert(ShortWorksEscrow.BadSignature.selector);
        escrow.fund(t, sig);
        vm.stopPrank();
    }

    // ---- fuzz ----------------------------------------------------------------------

    function testFuzz_release_splitsExactly(uint128 amount, uint16 feeBps) public {
        amount = uint128(bound(amount, 1, 1_000e6));
        feeBps = uint16(bound(feeBps, 0, 2000));
        ShortWorksEscrow.Terms memory t = terms();
        t.amount = amount;
        t.fee = uint128(uint256(amount) * feeBps / 10_000);
        bytes memory sig = sign(t, signerKey);
        vm.startPrank(client);
        usdc.approve(address(escrow), amount);
        escrow.fund(t, sig);
        escrow.release(JOB);
        vm.stopPrank();
        assertEq(usdc.balanceOf(freelancer) + usdc.balanceOf(treasury), amount);
        assertEq(usdc.balanceOf(treasury), t.fee);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }
}
