// Browser-side helpers for MetaMask (window.ethereum) on Arc. Used by /pay-with-arc,
// Hire & pay with Arc and Approve on Arc jobs.
import { arcChainParams } from "@/data/arc";

export function getEthereum() {
  const eth = typeof window !== "undefined" ? window.ethereum : null;
  if (!eth) throw new Error("MetaMask isn't installed in this browser. Install it from metamask.io, then refresh this page.");
  return eth;
}

// Asks to connect; returns the selected account.
export async function connectWallet(eth) {
  const [address] = await eth.request({ method: "eth_requestAccounts" });
  if (!address) throw new Error("No account was selected in MetaMask.");
  return address;
}

// Switch MetaMask to an Arc network, adding it first if it doesn't know it yet; then check it did.
export async function switchToArc(eth, arc) {
  const params = arcChainParams(arc);
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: params.chainId }] });
  } catch (err) {
    if (err.code !== 4902) throw err;
    await eth.request({ method: "wallet_addEthereumChain", params: [params] });
  }
  const now = await eth.request({ method: "eth_chainId" });
  if (Number(now) !== arc.chainId) throw new Error(`Switch MetaMask to ${arc.name} and try again.`);
}

export const sendTransaction = (eth, tx) => eth.request({ method: "eth_sendTransaction", params: [tx] });

// Waits until a transaction is in a block (about a second on Arc). Throws if it failed.
export async function waitForTransaction(eth, hash, timeoutMs = 120_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const receipt = await eth.request({ method: "eth_getTransactionReceipt", params: [hash] }).catch(() => null);
    if (receipt) {
      if (receipt.status !== "0x1") throw new Error("The transaction failed on Arc. No USDC was moved.");
      return receipt;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("The transaction is taking long to confirm. Refresh the page in a minute to see if it went through.");
}

// A readable message for a wallet / RPC error.
export const walletErrorMessage = (err) =>
  err?.code === 4001 || err?.code === "ACTION_REJECTED"
    ? "You cancelled the request in MetaMask."
    : err?.shortMessage ?? err?.data?.message ?? err?.message ?? "MetaMask reported an error.";
