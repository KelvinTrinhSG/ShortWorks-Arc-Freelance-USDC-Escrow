"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 3000;

// The freelancer's PayPal connection on /paypal (docs/payments.md §7).
// Connecting opens PayPal in a popup. PayPal often doesn't send the popup back to us,
// so while it is open we also ask our server (which asks PayPal) every few seconds.
export default function ConnectPaypal() {
  const [account, setAccount] = useState(null); // { status, merchantId, checkedAt }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const popup = useRef(null);

  const refresh = useCallback(async (askPaypal) => {
    const res = await fetch("/api/paypal/onboard/refresh", { method: askPaypal ? "POST" : "GET" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't check your PayPal account.");
    setAccount(data);
    return data;
  }, []);

  // The saved status, once on load (no call to PayPal).
  useEffect(() => {
    fetch("/api/paypal/onboard/refresh")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAccount(data))
      .catch(() => {});
  }, []);

  // While the PayPal window is open: poll until connected, or until it is closed.
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(async () => {
      const closed = !popup.current || popup.current.closed;
      try {
        const data = await refresh(true);
        if (data.status === "ready" || data.status === "blocked" || closed) {
          setBusy(false);
          if (!closed) popup.current.close();
        }
      } catch (err) {
        setError(err.message);
        setBusy(false);
      }
    }, POLL_MS);
    // The return page posts the result when PayPal does send the popup back.
    const onMessage = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== "paypal-connected") return;
      if (e.data.error) setError(e.data.error);
      refresh(false).finally(() => setBusy(false));
    };
    window.addEventListener("message", onMessage);
    return () => {
      clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [busy, refresh]);

  const connect = async () => {
    setError("");
    // Open the window right away (inside the click) so the browser doesn't block it.
    popup.current = window.open("", "paypal-connect", "width=520,height=720");
    setBusy(true);
    try {
      const res = await fetch("/api/paypal/onboard", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start connecting PayPal.");
      if (popup.current) popup.current.location.href = data.actionUrl;
      else window.location.href = data.actionUrl; // popup blocked: go there in this tab
    } catch (err) {
      popup.current?.close();
      setError(err.message);
      setBusy(false);
    }
  };

  const checkAgain = async () => {
    setError("");
    try {
      await refresh(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const status = account?.status ?? "not_connected";

  return (
    <div className="bdr1 bdrs8 p20 mb20" style={{ backgroundColor: status === "ready" ? "#f0faf3" : "#fafafa" }}>
      <div className="d-flex flex-wrap align-items-center gap-3">
        <span className="fab fa-paypal flex-shrink-0" style={{ fontSize: 30, color: "#003087" }} />
        <div className="flex-grow-1" style={{ minWidth: 200 }}>
          <p className="fw500 dark-color mb-0">
            {status === "ready"
              ? "PayPal connected · ready to get paid"
              : status === "blocked"
                ? "PayPal connected, but it can't receive payments yet"
                : status === "pending"
                  ? "Finishing your PayPal connection…"
                  : "Connect PayPal to get paid"}
          </p>
          <p className="fz14 text mb-0">
            {status === "ready"
              ? `Merchant ID ${account.merchantId}. Clients can now hire you; you're paid straight into this account.`
              : status === "blocked"
                ? "Confirm your email and make sure your PayPal account can receive payments, then check again."
                : "Clients can only hire you once your PayPal account is connected. You're paid directly to it when a job is approved."}
          </p>
        </div>
        {status === "ready" ? (
          <span className="badge rounded-pill fw500" style={{ color: "#15803d", background: "#e3f6ea", padding: "6px 12px" }}>
            Connected ✓
          </span>
        ) : (
          <div className="d-flex gap-2">
            {status !== "blocked" && (
              <button type="button" className="ud-btn btn-thm" onClick={connect} disabled={busy}>
                {busy ? "Waiting for PayPal…" : status === "pending" ? "Continue on PayPal" : "Connect PayPal"}
              </button>
            )}
            {(status === "pending" || status === "blocked") && (
              <button type="button" className="ud-btn btn-light-thm" onClick={checkAgain} disabled={busy}>
                Check again
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-danger fz14 mt10 mb-0">{error}</p>}
    </div>
  );
}
