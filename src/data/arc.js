// The Arc network (Circle's chain, gas paid in USDC), used by /pay-with-arc.
export const ARC = {
  name: "Arc",
  chainId: 5042,
  currency: "USDC",
  rpcUrl: "https://rpc.mainnet.arc.io",
  explorerUrl: "https://explorer.arc.io",
  infoUrl: "https://arc.io",
  // USDC's ERC-20 interface on Arc (6 decimals). The native balance is the same money in 18 decimals.
  usdc: "0x3600000000000000000000000000000000000000",
  usdcDecimals: 6,
};

// What MetaMask needs to add the network (wallet_addEthereumChain).
export const arcChainParams = {
  chainId: "0x" + ARC.chainId.toString(16),
  chainName: ARC.name,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [ARC.rpcUrl],
  blockExplorerUrls: [ARC.explorerUrl],
};

export const isWalletAddress = (s) => /^0x[0-9a-fA-F]{40}$/.test(s);
