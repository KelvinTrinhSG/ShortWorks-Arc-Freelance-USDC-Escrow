"use client";
import { ARC_NETWORKS, DEFAULT_ARC_NETWORK, getArc } from "@/data/arc";
import { switchToArc, walletErrorMessage } from "@/lib/metamask";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { isAddress } from "viem";

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const same = (a, b) => Boolean(a && b) && a.toLowerCase() === b.toLowerCase();
const formatDay = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// The network picked in this browser, kept in localStorage (and in step across tabs).
// The server render uses the default, so there's no hydration mismatch.
const STORAGE_KEY = "arcNetwork";
const networkListeners = new Set();
const subscribeNetwork = (cb) => {
  networkListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    networkListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const readNetwork = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return ARC_NETWORKS[saved] ? saved : DEFAULT_ARC_NETWORK;
};
const saveNetwork = (net) => {
  localStorage.setItem(STORAGE_KEY, net);
  networkListeners.forEach((cb) => cb());
};

async function walletApi(method, body) {
  const res = await fetch("/api/arc/wallet", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't save the wallet.");
  return data;
}

async function fetchBalance(address, network) {
  const res = await fetch(`/api/arc/balance?address=${address}&network=${network}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't load the balance.");
  return data;
}

// /pay-with-arc: the account's wallet and its USDC on Arc Testnet or Mainnet. Connecting with
// MetaMask or typing an address saves it on the account (POST /api/arc/wallet), so it shows
// again next time without MetaMask. For freelancers it's where Arc jobs pay out.
// `saved`: { address, savedAt } from the database, or null.
export default function ArcWallet({ saved: initialSaved = null, isFreelancer = false }) {
  const router = useRouter();
  const network = useSyncExternalStore(subscribeNetwork, readNetwork, () => DEFAULT_ARC_NETWORK);
  const [saved, setSaved] = useState(initialSaved);
  // The wallet on screen: the saved one at first, then whatever was connected or typed.
  const [wallet, setWallet] = useState(initialSaved && { address: initialSaved.address, source: "saved" });
  const [fetched, setFetched] = useState(null); // { key, data } | { key, error }
  const [reload, setReload] = useState(0);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false); // waiting for MetaMask or for saving
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const ARC = getArc(network);

  // The balance follows the wallet and the network; a reply for an older pair is ignored.
  const address = wallet?.address;
  const balanceKey = address ? `${address}|${network}|${reload}` : null;
  useEffect(() => {
    if (!address) return;
    let stale = false;
    const key = `${address}|${network}|${reload}`;
    fetchBalance(address, network)
      .then((data) => !stale && setFetched({ key, data }))
      .catch((err) => !stale && setFetched({ key, error: err.message }));
    return () => {
      stale = true;
    };
  }, [address, network, reload]);
  const balance = fetched?.key === balanceKey ? fetched : null;

  // Shows a wallet and saves it on the account (unless it's already the saved one).
  const applyWallet = async (addr, source) => {
    setWallet({ address: addr, source });
    setError("");
    if (same(addr, saved?.address)) return;
    try {
      const { wallet: w } = await walletApi("POST", { address: addr });
      setSaved(w);
      router.refresh(); // the page title area shows the saved wallet
    } catch (err) {
      setError(err.message);
    }
  };

  // Follow account switches in MetaMask while connected through it: the new account is saved.
  useEffect(() => {
    const eth = window.ethereum;
    if (wallet?.source !== "metamask" || !eth?.on) return;
    const onAccounts = (accounts) => accounts[0] && applyWallet(accounts[0], "metamask");
    eth.on("accountsChanged", onAccounts);
    return () => eth.removeListener?.("accountsChanged", onAccounts);
  });

  const changeNetwork = async (net) => {
    if (net === network) return;
    setError("");
    setNotice("");
    if (wallet?.source === "metamask") {
      // Only to keep MetaMask in step; the balance is read by ShortWorks either way.
      await switchToArc(window.ethereum, getArc(net)).catch((err) =>
        setNotice(`MetaMask didn't switch to ${getArc(net).name} (${walletErrorMessage(err)}). The balance below is still correct.`),
      );
    }
    saveNetwork(net);
  };

  const connectMetamask = async () => {
    setError("");
    setNotice("");
    const eth = window.ethereum;
    if (!eth?.request) {
      setError("MetaMask isn't installed in this browser. Install it from metamask.io, or enter a wallet address.");
      return;
    }
    setBusy(true);
    try {
      const [addr] = await eth.request({ method: "eth_requestAccounts" });
      if (!addr) throw new Error("No account was selected in MetaMask.");
      // Connected: save it now, even if switching the network below fails.
      await applyWallet(addr, "metamask");
      await switchToArc(eth, ARC).catch((err) =>
        setNotice(`Saved, but MetaMask didn't switch to ${ARC.name} (${walletErrorMessage(err)}). You can switch it later.`),
      );
    } catch (err) {
      setError(walletErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitAddress = async (e) => {
    e.preventDefault();
    setNotice("");
    const addr = input.trim();
    // isAddress also checks the capital letters of a mixed-case address (EIP-55), which catches most typos.
    if (!isAddress(addr)) {
      setError("That isn't a valid wallet address. Check it for typos (0x followed by 40 characters).");
      return;
    }
    setBusy(true);
    await applyWallet(addr, "manual");
    setInput("");
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await walletApi("DELETE");
      setSaved(null);
      setWallet(null);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isSaved = same(wallet?.address, saved?.address);
  const sourceLabel = { metamask: "MetaMask wallet", manual: "Wallet entered by hand", saved: "Your saved wallet" }[wallet?.source];

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-3 mb20">
        <span className="fz14 text">Network</span>
        {/* Plain buttons: the theme's .btn-dark has an animated skewed :before. */}
        <div role="group" aria-label="Arc network" className="d-inline-flex bdrs4 overflow-hidden" style={{ border: "1px solid #222" }}>
          {Object.values(ARC_NETWORKS).map((n) => {
            const active = network === n.key;
            return (
              <button
                key={n.key}
                type="button"
                aria-pressed={active}
                onClick={() => changeNetwork(n.key)}
                disabled={busy}
                className="fz14 border-0"
                style={{
                  padding: "4px 14px",
                  background: active ? "#222" : "#fff",
                  color: active ? "#fff" : "#222",
                  cursor: busy ? "default" : "pointer",
                }}
              >
                {n.label}
              </button>
            );
          })}
        </div>
        {ARC.isTestnet ? (
          <span className="badge rounded-pill" style={{ color: "#b45309", background: "#fef3c7" }}>Test USDC, no real value</span>
        ) : (
          <span className="badge rounded-pill" style={{ color: "#b91c1c", background: "#fee2e2" }}>Real USDC</span>
        )}
      </div>

      {!wallet ? (
        <>
          {isFreelancer && !saved && (
            <p className="fz14 dark-color mb15">
              Add your wallet so clients can hire you with USDC on Arc. Payments for those jobs go to this wallet.
            </p>
          )}
          {saved && (
            <p className="fz14 text mb15">
              Saved wallet: <span className="dark-color fw500" title={saved.address}>{short(saved.address)}</span> ·{" "}
              <button type="button" className="btn btn-link p-0 fz14 align-baseline text-thm" onClick={() => setWallet({ address: saved.address, source: "saved" })}>
                Keep using it
              </button>
            </p>
          )}
          <div className="row">
            <div className="col-md-6 mb20">
              <div className="bdr1 bdrs8 p20 h-100" style={{ backgroundColor: "#fafafa" }}>
                <div className="d-flex align-items-center gap-2 mb10">
                  <img src="/images/icon/metamask-logo.svg" alt="" width={28} height={28} />
                  <h5 className="mb-0">Connect MetaMask</h5>
                </div>
                <p className="fz14 text">MetaMask asks to connect and to switch to {ARC.name}. The wallet is saved to your account.</p>
                <button type="button" className="ud-btn btn-thm" onClick={connectMetamask} disabled={busy}>
                  {busy ? "Waiting for MetaMask…" : "Connect MetaMask"}
                </button>
              </div>
            </div>
            <div className="col-md-6 mb20">
              <form className="bdr1 bdrs8 p20 h-100" style={{ backgroundColor: "#fafafa" }} onSubmit={submitAddress}>
                <h5 className="mb10">Or enter a wallet address</h5>
                <p className="fz14 text">
                  Saved to your account; nothing is signed or sent.
                  {isFreelancer && " Copy it from your wallet: USDC paid to a wrong address can't be recovered."}
                </p>
                <input
                  type="text"
                  className="form-control mb15"
                  placeholder="0x…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
                <button type="submit" className="ud-btn btn-light-thm" disabled={busy}>
                  {busy ? "Saving…" : "Save wallet"}
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <div className="bdr1 bdrs8 p20 mb20" style={{ backgroundColor: "#f0faf3" }}>
          <div className="d-flex flex-wrap align-items-center gap-3">
            <img src="/images/icon/arc-logo.png" alt="Arc" width={40} height={40} className="flex-shrink-0" />
            <div className="flex-grow-1" style={{ minWidth: 200 }}>
              <p className="fz14 text mb-0">
                {sourceLabel} ·{" "}
                <a href={`${ARC.explorerUrl}/address/${wallet.address}`} target="_blank" rel="noreferrer" className="text-thm" title={wallet.address}>
                  {short(wallet.address)} ↗
                </a>
              </p>
              <h3 className="mb-0">
                {!balance ? "Loading…" : balance.data ? `${balance.data.balance} ${ARC.currency}` : "—"}
              </h3>
              {balance?.data && (
                <p className="fz13 text mb-0">USDC balance on {ARC.name} · block {balance.data.blockNumber.toLocaleString("en-US")}</p>
              )}
              {balance?.error && <p className="fz13 text-danger mb-0">{balance.error}</p>}
              <p className="fz13 mb-0 mt5">
                {isSaved ? (
                  <span className="text-success">
                    ✓ Saved to your account{saved.savedAt && ` on ${formatDay(saved.savedAt)}`}
                    {isFreelancer && " · clients pay you here"}
                  </span>
                ) : (
                  <span className="text-danger">Not saved to your account</span>
                )}
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="ud-btn btn-thm" onClick={() => setReload((n) => n + 1)} disabled={busy || !balance}>
                {!balance ? "Loading…" : "Refresh"}
              </button>
              {!isSaved && (
                <button type="button" className="ud-btn btn-thm" onClick={() => applyWallet(wallet.address, wallet.source)} disabled={busy}>
                  Save
                </button>
              )}
              <button
                type="button"
                className="ud-btn btn-light-thm"
                onClick={() => {
                  setWallet(null);
                  setError("");
                  setNotice("");
                }}
                disabled={busy}
              >
                Change wallet
              </button>
              {saved && (
                <button type="button" className="ud-btn btn-light-thm" onClick={remove} disabled={busy}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {notice && <p className="fz14 mb20" style={{ color: "#b45309" }}>{notice}</p>}
      {error && <p className="text-danger fz14 mb20">{error}</p>}

      <h5 className="mb15">{ARC.name} network</h5>
      <table className="table mb-0 fz14">
        <tbody>
          <tr><td className="text">Network</td><td className="dark-color">{ARC.name}</td></tr>
          <tr><td className="text">Chain ID</td><td className="dark-color">{ARC.chainId}</td></tr>
          <tr><td className="text">Currency</td><td className="dark-color">{ARC.currency}</td></tr>
          <tr><td className="text">Status</td><td><span className="badge rounded-pill" style={{ color: "#15803d", background: "#e3f6ea" }}>Active</span></td></tr>
          <tr><td className="text">Info</td><td><a href={ARC.infoUrl} target="_blank" rel="noreferrer" className="text-thm">{ARC.infoUrl}</a></td></tr>
          <tr><td className="text">Explorer</td><td><a href={ARC.explorerUrl} target="_blank" rel="noreferrer" className="text-thm">{ARC.explorerUrl}</a></td></tr>
          <tr><td className="text">RPC URL</td><td className="dark-color">{ARC.rpcUrl}</td></tr>
        </tbody>
      </table>
    </>
  );
}
