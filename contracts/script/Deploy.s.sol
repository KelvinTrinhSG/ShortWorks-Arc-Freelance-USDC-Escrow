// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ShortWorksEscrow} from "../src/ShortWorksEscrow.sol";

// Deploys ShortWorksEscrow (README.md in this folder):
//   forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
// Reads ARC_ADMIN, ARC_OPERATOR, ARC_SIGNER, ARC_TREASURY (addresses) from the environment.
contract Deploy is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (ShortWorksEscrow escrow) {
        address admin = vm.envAddress("ARC_ADMIN");
        address operator = vm.envAddress("ARC_OPERATOR");
        address signer = vm.envAddress("ARC_SIGNER");
        address treasury = vm.envAddress("ARC_TREASURY");

        vm.startBroadcast();
        escrow = new ShortWorksEscrow(IERC20(USDC), admin, operator, signer, treasury);
        vm.stopBroadcast();

        console.log("ShortWorksEscrow:", address(escrow));
        console.log("chain id:", block.chainid);
        console.log("deployed at block:", block.number);
    }
}
