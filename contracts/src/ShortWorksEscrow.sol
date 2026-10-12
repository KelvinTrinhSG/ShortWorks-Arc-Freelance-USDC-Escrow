// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ShortWorksEscrow
/// @notice Holds a client's USDC for one ShortWorks job until it is released to the freelancer
/// (minus the platform fee) or refunded to the client. See docs/arc-payments.md.
/// @dev The money of a job can only ever go to the three addresses fixed when it was funded:
/// the client, the freelancer and the treasury (fee only). Neither ADMIN nor OPERATOR can
/// send it anywhere else. There is no upgrade path: new rules mean a new deployment.
contract ShortWorksEscrow is AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    /// @notice The platform fee can never be more than 20% of a job, whatever the server signs.
    uint256 public constant MAX_FEE_BPS = 2000;
    bytes32 public constant TERMS_TYPEHASH = keccak256(
        "Terms(uint256 jobId,address client,address freelancer,uint128 amount,uint128 fee,uint64 expiresAt,uint64 signatureDeadline)"
    );

    enum Status {
        None,
        Funded,
        Released,
        Refunded
    }

    struct Job {
        address client;
        uint64 expiresAt; // after this the client may reclaim, unless frozen
        Status status;
        address freelancer;
        uint64 frozenAt; // 0 = not frozen; otherwise when the dispute started
        address treasury; // where the fee goes, fixed at funding
        uint128 amount; // total USDC (6 decimals)
        uint128 fee; // part of amount kept by ShortWorks
    }

    /// @notice What ShortWorks agreed to for a job, signed by `signer` (EIP-712). The client can't change it.
    struct Terms {
        uint256 jobId;
        address client;
        address freelancer;
        uint128 amount;
        uint128 fee;
        uint64 expiresAt;
        uint64 signatureDeadline;
    }

    /// @notice An EIP-2612 permit for USDC, signed by the client, so funding is one transaction.
    struct Permit {
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    IERC20 public immutable usdc;
    address public signer;
    address public treasury;
    mapping(uint256 jobId => Job) public jobs;

    event Funded(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        uint256 amount,
        uint256 fee,
        uint64 expiresAt
    );
    event Released(uint256 indexed jobId, uint256 toFreelancer, uint256 fee, address by);
    event Refunded(uint256 indexed jobId, uint256 amount, address by);
    event Frozen(uint256 indexed jobId, bool frozen, uint64 expiresAt);
    event SignerChanged(address signer);
    event TreasuryChanged(address treasury);

    error NotClient();
    error NotAllowed();
    error BadSignature();
    error SignatureExpired();
    error AlreadyFunded();
    error NotFunded();
    error BadTerms();
    error NotExpired();
    error IsFrozen();
    error ZeroAddress();

    constructor(IERC20 usdc_, address admin, address operator, address signer_, address treasury_)
        EIP712("ShortWorksEscrow", "1")
    {
        if (address(usdc_) == address(0) || admin == address(0) || signer_ == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }
        usdc = usdc_;
        signer = signer_;
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (operator != address(0)) _grantRole(OPERATOR_ROLE, operator);
    }

    // ---- Funding (client) ----------------------------------------------------------

    /// @notice Hold the job's USDC in one transaction, using a USDC permit instead of `approve`.
    function fundWithPermit(Terms calldata t, bytes calldata serverSig, Permit calldata p) external {
        // If someone already used this permit (front-running), the allowance is there anyway; let
        // transferFrom decide.
        try IERC20Permit(address(usdc)).permit(msg.sender, address(this), t.amount, p.deadline, p.v, p.r, p.s) {} catch {}
        _fund(t, serverSig);
    }

    /// @notice Hold the job's USDC after the client approved this contract for `t.amount`.
    function fund(Terms calldata t, bytes calldata serverSig) external {
        _fund(t, serverSig);
    }

    function _fund(Terms calldata t, bytes calldata serverSig) private whenNotPaused nonReentrant {
        if (msg.sender != t.client) revert NotClient();
        if (block.timestamp > t.signatureDeadline) revert SignatureExpired();
        if (ECDSA.recover(hashTerms(t), serverSig) != signer) revert BadSignature();
        if (jobs[t.jobId].status != Status.None) revert AlreadyFunded();
        if (
            t.amount == 0 || t.freelancer == address(0) || t.freelancer == t.client
                || uint256(t.fee) * 10_000 > uint256(t.amount) * MAX_FEE_BPS || t.expiresAt <= block.timestamp
        ) revert BadTerms();

        jobs[t.jobId] = Job({
            client: t.client,
            expiresAt: t.expiresAt,
            status: Status.Funded,
            freelancer: t.freelancer,
            frozenAt: 0,
            treasury: treasury,
            amount: t.amount,
            fee: t.fee
        });
        emit Funded(t.jobId, t.client, t.freelancer, t.amount, t.fee, t.expiresAt);
        usdc.safeTransferFrom(t.client, address(this), t.amount);
    }

    /// @notice The EIP-712 digest the server signs for these terms.
    function hashTerms(Terms calldata t) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    TERMS_TYPEHASH, t.jobId, t.client, t.freelancer, t.amount, t.fee, t.expiresAt, t.signatureDeadline
                )
            )
        );
    }

    // ---- Settling ------------------------------------------------------------------
    // Not stopped by pause(): money already held must always be able to leave.

    /// @notice Pay the freelancer (amount - fee) and the treasury (fee). By the client, or by
    /// ShortWorks (auto-approve, dispute decided for the freelancer).
    function release(uint256 jobId) external nonReentrant {
        Job storage j = _funded(jobId);
        if (msg.sender != j.client && !hasRole(OPERATOR_ROLE, msg.sender)) revert NotAllowed();
        j.status = Status.Released;
        uint256 toFreelancer = j.amount - j.fee;
        emit Released(jobId, toFreelancer, j.fee, msg.sender);
        usdc.safeTransfer(j.freelancer, toFreelancer);
        if (j.fee > 0) usdc.safeTransfer(j.treasury, j.fee);
    }

    /// @notice Give everything back to the client. By ShortWorks (undo hire, dispute decided for
    /// the client), or by the freelancer giving up the job.
    function refund(uint256 jobId) external nonReentrant {
        Job storage j = _funded(jobId);
        if (msg.sender != j.freelancer && !hasRole(OPERATOR_ROLE, msg.sender)) revert NotAllowed();
        _refund(jobId, j);
    }

    /// @notice The client takes the money back after `expiresAt`, without ShortWorks. Blocked
    /// while a dispute is open.
    function reclaim(uint256 jobId) external nonReentrant {
        Job storage j = _funded(jobId);
        if (msg.sender != j.client) revert NotClient();
        if (j.frozenAt != 0) revert IsFrozen();
        if (block.timestamp <= j.expiresAt) revert NotExpired();
        _refund(jobId, j);
    }

    function _refund(uint256 jobId, Job storage j) private {
        j.status = Status.Refunded;
        emit Refunded(jobId, j.amount, msg.sender);
        usdc.safeTransfer(j.client, j.amount);
    }

    function _funded(uint256 jobId) private view returns (Job storage j) {
        j = jobs[jobId];
        if (j.status != Status.Funded) revert NotFunded();
    }

    // ---- Disputes (OPERATOR) ---------------------------------------------------------

    /// @notice Freeze a job while a dispute is open (stops reclaim). Unfreezing pushes
    /// `expiresAt` back by the time it was frozen, so the dispute doesn't eat the client's wait.
    function setFrozen(uint256 jobId, bool frozen) external onlyRole(OPERATOR_ROLE) {
        Job storage j = _funded(jobId);
        if (frozen && j.frozenAt == 0) {
            j.frozenAt = uint64(block.timestamp);
        } else if (!frozen && j.frozenAt != 0) {
            j.expiresAt += uint64(block.timestamp) - j.frozenAt;
            j.frozenAt = 0;
        } else {
            return;
        }
        emit Frozen(jobId, frozen, j.expiresAt);
    }

    // ---- Admin -------------------------------------------------------------------------

    /// @notice Stop new funding during an incident. Release, refund and reclaim keep working.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function setSigner(address signer_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (signer_ == address(0)) revert ZeroAddress();
        signer = signer_;
        emit SignerChanged(signer_);
    }

    /// @notice Where the fee of jobs funded from now on goes. Jobs already funded keep theirs.
    function setTreasury(address treasury_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryChanged(treasury_);
    }
}
