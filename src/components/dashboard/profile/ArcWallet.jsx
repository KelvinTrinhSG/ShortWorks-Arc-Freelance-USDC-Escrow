"use client";
import { ARC, arcChainParams, isWalletAddress } from "@/data/arc";
import { useCallback, useEffect, useState } from "react";

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Connect a wallet on /pay-with-arc (MetaMask, or a typed address) and show its USDC on Arc.
export default function ArcWallet() {
  const [wallet, setWallet] = useState(null); // { address, source: "metamask" | "manual" }
  const [result, setResult] = useState(null); // { balance, blockNumber }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadBalance = useCallback(async (address) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/arc/balance?address=${address}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load the balance.");
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const showWallet = useCallback(
    (address, source) => {
      setWallet({ address, source });
      loadBalance(address);
    },
    [loadBalance],
  );

  // Follow account switches in MetaMask while connected through it.
  useEffect(() => {
    const eth = window.ethereum;
    if (wallet?.source !== "metamask" || !eth?.on) return;
    const onAccounts = (accounts) => (accounts[0] ? showWallet(accounts[0], "metamask") : setWallet(null));
    eth.on("accountsChanged", onAccounts);
    return () => eth.removeListener?.("accountsChanged", onAccounts);
  }, [wallet?.source, showWallet]);

  const connectMetamask = async () => {
    setError("");
    const eth = window.ethereum;
    if (!eth?.isMetaMask) {
      setError("MetaMask isn't installed in this browser. Install it from metamask.io, or enter a wallet address below.");
      return;
    }
    setBusy(true);
    try {
      const [address] = await eth.request({ method: "eth_requestAccounts" });
      // Switch MetaMask to Arc, adding the network first if it doesn't know it yet.
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: arcChainParams.chainId }] });
      } catch (err) {
        if (err.code !== 4902) throw err;
        await eth.request({ method: "wallet_addEthereumChain", params: [arcChainParams] });
      }
      showWallet(address, "metamask");
    } catch (err) {
      setBusy(false);
      setError(err.code === 4001 ? "You cancelled the request in MetaMask." : err.message);
    }
  };

  const submitAddress = (e) => {
    e.preventDefault();
    const address = input.trim();
    if (!isWalletAddress(address)) {
      setError("That isn't a valid wallet address (0x followed by 40 characters).");
      return;
    }
    showWallet(address, "manual");
  };

  const disconnect = () => {
    setWallet(null);
    setResult(null);
    setError("");
  };

  return (
    <>
      {!wallet ? (
        <div className="row">
          <div className="col-md-6 mb20">
            <div className="bdr1 bdrs8 p20 h-100" style={{ backgroundColor: "#fafafa" }}>
              <div className="d-flex align-items-center gap-2 mb10">
                <img src="/images/icon/metamask-logo.svg" alt="" width={28} height={28} />
                <h5 className="mb-0">Connect MetaMask</h5>
              </div>
              <p className="fz14 text">MetaMask will ask to connect and to switch to the Arc network.</p>
              <button type="button" className="ud-btn btn-thm" onClick={connectMetamask} disabled={busy}>
                {busy ? "Waiting for MetaMask…" : "Connect MetaMask"}
              </button>
            </div>
          </div>
          <div className="col-md-6 mb20">
            <form className="bdr1 bdrs8 p20 h-100" style={{ backgroundColor: "#fafafa" }} onSubmit={submitAddress}>
              <h5 className="mb10">Or enter a wallet address</h5>
              <p className="fz14 text">We only read its balance; nothing is signed or sent.</p>
              <input
                type="text"
                className="form-control mb15"
                placeholder="0x…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
              />
              <button type="submit" className="ud-btn btn-light-thm" disabled={busy}>
                Check balance
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bdr1 bdrs8 p20 mb20" style={{ backgroundColor: "#f0faf3" }}>
          <div className="d-flex flex-wrap align-items-center gap-3">
            <img src="/images/icon/arc-logo.png" alt="Arc" width={40} height={40} className="flex-shrink-0" />
            <div className="flex-grow-1" style={{ minWidth: 200 }}>
              <p className="fz14 text mb-0">
                {wallet.source === "metamask" ? "MetaMask wallet" : "Wallet"} ·{" "}
                <a href={`${ARC.explorerUrl}/address/${wallet.address}`} target="_blank" rel="noreferrer" className="text-thm" title={wallet.address}>
                  {short(wallet.address)} ↗
                </a>
              </p>
              <h3 className="mb-0">
                {busy && !result ? "Loading…" : result ? `${result.balance} ${ARC.currency}` : "—"}
              </h3>
              {result && <p className="fz13 text mb-0">USDC balance on Arc · block {result.blockNumber.toLocaleString("en-US")}</p>}
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="ud-btn btn-thm" onClick={() => loadBalance(wallet.address)} disabled={busy}>
                {busy ? "Refreshing…" : "Refresh"}
              </button>
              <button type="button" className="ud-btn btn-light-thm" onClick={disconnect} disabled={busy}>
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-danger fz14 mb20">{error}</p>}

      <h5 className="mb15">Arc network</h5>
      <table className="table mb-0 fz14">
        <tbody>
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
