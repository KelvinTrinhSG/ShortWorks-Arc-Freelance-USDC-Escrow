"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Client's Accept / Decline buttons on a proposal; Undo puts it back to pending.
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
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {proposal.status === "pending" ? (
          <>
            <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={() => decide("accepted")}>
              Accept
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => decide("declined")}>
              Decline
            </button>
          </>
        ) : (
          <>
            <span className="fz14 text">
              {proposal.status === "accepted"
                ? "You accepted this proposal. The project is now hidden from the Projects page."
                : "You declined this proposal."}
            </span>
            <button type="button" className="btn btn-sm btn-link p-0" disabled={busy} onClick={() => decide("pending")}>
              Undo
            </button>
          </>
        )}
      </div>
      {error && <p className="text-danger fz13 mt5 mb-0">{error}</p>}
    </div>
  );
}
