"use client";
import { JOB_NOTE_MAX } from "@/data/projectOptions";
import { confirmDialog } from "@/store/confirmStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Admin's decision on one dispute: everything to the freelancer, or everything back
// to the client. No split (docs/payments.md §12). The note is shown to both sides.
export default function DisputeDecision({ jobId, amount, freelancerName, clientName }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decide = async (decision) => {
    if (!note.trim()) {
      setError("Write the reason first: both sides will read it.");
      return;
    }
    const ok = await confirmDialog(
      decision === "pay"
        ? {
            title: `Pay ${freelancerName} $${amount}?`,
            message: "PayPal takes the held payment from the client and pays the freelancer (minus fees). This can't be undone.",
            confirmLabel: "Pay freelancer",
          }
        : {
            title: `Release $${amount} to ${clientName}?`,
            message: "The PayPal hold is cancelled, the client is not charged and the job is cancelled. This can't be undone.",
            confirmLabel: "Release to client",
            danger: true,
          },
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="mt15">
      <textarea
        className="form-control mb10"
        rows={2}
        maxLength={JOB_NOTE_MAX}
        placeholder="Reason for the decision (shown to both sides)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="ud-btn btn-thm" disabled={busy} onClick={() => decide("pay")}>
          Pay freelancer
        </button>
        <button type="button" className="ud-btn btn-light-thm" disabled={busy} onClick={() => decide("release")}>
          Release to client
        </button>
      </div>
      {error && <p className="text-danger fz14 mt10 mb-0">{error}</p>}
    </div>
  );
}
