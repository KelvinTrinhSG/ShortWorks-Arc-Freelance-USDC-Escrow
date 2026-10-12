"use client";
import { confirmDialog } from "@/store/confirmStore";
import Link from "next/link";
import HireAndPay from "./HireAndPay";
import HireWithArc from "./HireWithArc";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Client's Hire & pay (PayPal, or USDC on Arc) / Decline buttons on a proposal; Undo puts it
// back to pending (and releases the PayPal hold or refunds the Arc escrow).
export default function ProposalDecision({ proposal }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decide = async (status) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-start">
        {proposal.status === "pending" ? (
          <>
            {/* Hiring = the money is held first: by PayPal (docs/payments.md) or in the Arc escrow (docs/arc-payments.md). */}
            <HireAndPay proposal={proposal} label={proposal.hire.arc ? `Hire & pay $${proposal.hire.amount} with PayPal` : undefined} />
            {proposal.hire.arc && <HireWithArc proposal={proposal} label={`Hire & pay ${proposal.hire.amount} USDC on Arc`} />}
            <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => decide("declined")}>
              Decline
            </button>
          </>
        ) : (
          <>
            <span className="fz14 text">
              {proposal.status === "accepted"
                ? "You hired this freelancer. The project moved from Projects to Jobs."
                : "You declined this proposal."}
            </span>
            {proposal.status === "accepted" && (
              <Link href={`/jobs/${proposal.id}`} className="btn btn-sm btn-dark">
                Manage Job →
              </Link>
            )}
            {/* The API refuses once work was handed in; it says so in the error below. */}
            <button
              type="button"
              className="btn btn-sm btn-link p-0"
              disabled={busy}
              onClick={async () => {
                if (proposal.status === "accepted") {
                  const ok = await confirmDialog({
                    title: "Undo this hire?",
                    message: `The payment held for ${proposal.freelancer.displayName} is released (PayPal) or sent back to your wallet (USDC on Arc), so you're not charged. The proposal goes back to waiting.`,
                    confirmLabel: "Undo hire",
                    danger: true,
                  });
                  if (!ok) return;
                }
                decide("pending");
              }}
            >
              Undo
            </button>
          </>
        )}
      </div>
      {error && <p className="text-danger fz13 mt5 mb-0">{error}</p>}
    </div>
  );
}
