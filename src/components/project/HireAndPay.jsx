"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

// The PayPal JS SDK is loaded for one seller (merchant-id is part of its URL), so it is
// reloaded when the client hires a different freelancer.
function loadPaypalSdk(merchantId) {
  const src =
    `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CLIENT_ID)}` +
    `&currency=USD&intent=authorize&components=buttons&merchant-id=${encodeURIComponent(merchantId)}`;
  const current = document.getElementById("paypal-sdk");
  if (current?.src === src && window.paypal) return Promise.resolve(window.paypal);
  current?.remove();
  delete window.paypal;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = src;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error("Couldn't load PayPal. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

// Hire & pay on a pending proposal (project owner): PayPal holds the total on the
// client's account, the job starts, and the money is only taken when the client approves.
// `autoOpen`: show the PayPal step right away (service orders, after the order is created).
// `label`: the button text (default "Hire & pay $X").
export default function HireAndPay({ proposal, autoOpen = false, label }) {
  const router = useRouter();
  const { hire, freelancer } = proposal;
  const [open, setOpen] = useState(autoOpen);
  const [state, setState] = useState({ loading: autoOpen, error: "", hiring: false });
  const buttons = useRef(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let rendered = null;
    const fail = (message) => !cancelled && setState({ loading: false, error: message, hiring: false });

    loadPaypalSdk(hire.merchantId)
      .then((paypal) => {
        if (cancelled || !buttons.current) return;
        rendered = paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay" },
          createOrder: async () => {
            const res = await fetch(`/api/proposals/${proposal.id}/checkout`, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Couldn't start the payment.");
            return data.orderId;
          },
          onApprove: async ({ orderID }) => {
            setState({ loading: false, error: "", hiring: true });
            const res = await fetch(`/api/proposals/${proposal.id}/checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: orderID }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return fail(data.error || "Couldn't hold the payment.");
            router.push(`/jobs/${proposal.id}`);
          },
          onCancel: () => fail("Payment cancelled. Nothing was charged."),
          onError: (err) => fail(err?.message || "PayPal reported an error. Nothing was charged."),
        });
        return rendered.render(buttons.current).then(() => !cancelled && setState((s) => ({ ...s, loading: false })));
      })
      .catch((err) => fail(err.message));

    return () => {
      cancelled = true;
      rendered?.close?.().catch(() => {});
    };
  }, [open, hire.merchantId, proposal.id, router]);

  if (hire.blocker) {
    return (
      <div>
        <button type="button" className="btn btn-sm btn-success" disabled>
          {label ?? `Hire & pay $${hire.amount}`}
        </button>
        <p className="fz13 text mt5 mb-0">{hire.blocker}</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-success"
        onClick={() => {
          setState({ loading: true, error: "", hiring: false });
          setOpen(true);
        }}
      >
        {label ?? `Hire & pay $${hire.amount}`}
      </button>
      {open && (
        <div
          className="confirm-dialog-backdrop d-flex align-items-center justify-content-center p-3"
          onMouseDown={(e) => e.target === e.currentTarget && !state.hiring && setOpen(false)}
        >
          <div className="confirm-dialog bgc-white bdrs12 p30" role="dialog" aria-modal="true" aria-labelledby="hire-title">
            <h4 id="hire-title" className="mb10">
              Hire {freelancer.displayName} for ${hire.amount}
            </h4>
            <p className="text fz14 mb20">
              PayPal <strong>holds</strong> ${hire.amount} on your account now. You&apos;re only charged when you
              approve the delivered videos. Undo the hire before any work is delivered and the hold is released.
            </p>
            {state.hiring ? (
              <p className="dark-color fw500 mb-0">Holding the payment and starting the job…</p>
            ) : (
              <>
                {state.loading && <p className="text fz14">Loading PayPal…</p>}
                <div ref={buttons} />
              </>
            )}
            {state.error && <p className="text-danger fz14 mt10 mb-0">{state.error}</p>}
            {!state.hiring && (
              <div className="text-end mt15">
                <button type="button" className="ud-btn btn-white bdr1" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
