// The Arc network (Circle's chain, gas paid in USDC), used by /pay-with-arc.
// NEXT_PUBLIC_ARC_NETWORK=testnet | mainnet sets the default (testnet if unset, so no real money moves by accident);
// /pay-with-arc can switch between them. It's inlined at build time: restart `npm run dev` / redeploy after changing it.
const shared = {
  currency: "USDC",
  infoUrl: "https://arc.io",
  // USDC's ERC-20 interface on Arc (6 decimals), same address on testnet and mainnet.
  // The native balance is the same money in 18 decimals.
  usdc: "0x3600000000000000000000000000000000000000",
  usdcDecimals: 6,
};

export const ARC_NETWORKS = {
  testnet: {
    ...shared,
    key: "testnet",
    label: "Testnet",
    name: "Arc Testnet",
    isTestnet: true,
    chainId: 5042002,
    rpcUrl: "https://rpc.testnet.arc.network",
    explorerUrl: "https://testnet.arcscan.app",
  },
  mainnet: {
    ...shared,
    key: "mainnet",
    label: "Mainnet",
    name: "Arc",
    isTestnet: false,
    chainId: 5042,
    rpcUrl: "https://rpc.mainnet.arc.io",
    explorerUrl: "https://explorer.arc.io",
  },
};

export const DEFAULT_ARC_NETWORK = process.env.NEXT_PUBLIC_ARC_NETWORK === "mainnet" ? "mainnet" : "testnet";

// The network for a key ("testnet" / "mainnet"); anything else gets the default.
export const getArc = (network) => ARC_NETWORKS[network] ?? ARC_NETWORKS[DEFAULT_ARC_NETWORK];

// The network payments use (always the default; the switch on /pay-with-arc is only for looking).
export const ARC = getArc(DEFAULT_ARC_NETWORK);

// The network a payment was made on, from its chain id (for explorer links on old payments).
export const arcByChainId = (chainId) => Object.values(ARC_NETWORKS).find((n) => n.chainId === Number(chainId)) ?? ARC;
// What MetaMask needs to add the network (wallet_addEthereumChain).
export const arcChainParams = (arc) => ({
  chainId: "0x" + arc.chainId.toString(16),
  chainName: arc.name,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [arc.rpcUrl],
  blockExplorerUrls: [arc.explorerUrl],
});

export const isWalletAddress = (s) => /^0x[0-9a-fA-F]{40}$/.test(s);
