"use client";
import { DISPUTE_REASONS, JOB_NOTE_MAX } from "@/data/projectOptions";
import { confirmDialog } from "@/store/confirmStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

// The "next step" box on /jobs/{id}: what the viewer can do now, by role and status.
// Every action goes to POST /api/jobs/{id}; the page re-renders with the new status.
export default function JobActions({
  jobId,
  role,
  status,
  videoCount,
  total,
  freelancerName,
  autoApproveAt,
  disputeOpenedByMe,
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // null | "revision" | "dispute"
  const [links, setLinks] = useState([""]);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  const run = async (action, extra = {}) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setForm(null);
      setNote("");
      setLinks([""]);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const noteField = (placeholder, required) => (
    <textarea
      className="form-control mb10"
      rows={3}
      maxLength={JOB_NOTE_MAX}
      placeholder={placeholder}
      value={note}
      onChange={(e) => setNote(e.target.value)}
      required={required}
    />
  );

  const canDispute = status === "in_progress" || status === "submitted";
  let main = null;

  if (status === "in_progress" && role === "freelancer") {
    main = (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run("submit", { links, note });
        }}
      >
        <h5 className="mb5">Submit your videos</h5>
        <p className="text fz14 mb15">
          One link per video (Google Drive, Dropbox, or a private TikTok / YouTube link), or one
          folder link for all {videoCount}. The client then reviews and approves.
        </p>
        {links.map((l, i) => (
          <div key={i} className="d-flex gap-2 mb10">
            <input
              className="form-control"
              type="url"
              required={i === 0}
              placeholder={videoCount > 1 ? `Video ${i + 1} link` : "Video link"}
              value={l}
              onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {i > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setLinks(links.filter((_, j) => j !== i))}
                aria-label="Remove link"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {links.length < videoCount && (
          <button type="button" className="btn btn-sm btn-link p-0 mb15 text-thm" onClick={() => setLinks([...links, ""])}>
            + Add another link
          </button>
        )}
        {noteField("Note for the client (optional): what you made, anything to check")}
        <button type="submit" className="ud-btn btn-thm" disabled={busy}>
          Submit for review <i className="fal fa-arrow-right-long" />
        </button>
      </form>
    );
  } else if (status === "in_progress") {
    main = (
      <>
        <h5 className="mb5">The freelancer is working on it</h5>
        <p className="text fz14 mb-0">You'll be notified when the videos are submitted for your review.</p>
      </>
    );
  } else if (status === "submitted" && role === "client") {
    main =
      form === "revision" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run("revision", { note });
          }}
        >
          <h5 className="mb10">Request changes</h5>
          {noteField("What should the freelancer change? Be specific: video number, timestamp, what to fix.", true)}
          <div className="d-flex gap-2">
            <button type="submit" className="ud-btn btn-thm" disabled={busy}>
              Send request
            </button>
            <button type="button" className="ud-btn btn-light-thm" onClick={() => setForm(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <h5 className="mb5">Review the delivery</h5>
          <p className="text fz14 mb15">
            Check the delivered videos above. Approving completes the job and pays{" "}
            <strong>${total}</strong> to {freelancerName} through PayPal.
            {autoApproveAt && (
              <>
                {" "}
                If you don&apos;t answer, it&apos;s approved automatically on <strong>{autoApproveAt}</strong>.
              </>
            )}
          </p>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="ud-btn btn-thm"
              disabled={busy}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Approve the work?",
                  message: `$${total} will be paid to ${freelancerName} from the payment PayPal is holding. This completes the job; you can't request changes afterwards.`,
                  confirmLabel: "Approve & Complete",
                });
                if (ok) run("approve");
              }}
            >
              Approve & Complete
            </button>
            <button type="button" className="ud-btn btn-light-thm" disabled={busy} onClick={() => setForm("revision")}>
              Request changes
            </button>
          </div>
        </>
      );
  } else if (status === "submitted") {
    main = (
      <>
        <h5 className="mb5">🎉 Nice work, your videos are in!</h5>
        <p className="text fz14 mb-0">
          Now waiting for the client&apos;s review. They either approve (you&apos;re paid to your PayPal
          account) or ask for changes. You&apos;ll get a notification either way.
          {autoApproveAt && <> No answer by {autoApproveAt}? It&apos;s approved and paid automatically.</>}
        </p>
      </>
    );
  } else if (status === "completed") {
    main = (
      <>
        <h5 className="mb5 text-success">🎉 Job completed</h5>
        <p className="text fz14 mb-0">
          {role === "client" ? "The work is approved and the freelancer is paid. Thanks for hiring on ShortWorks!" : "The work is approved and the payment went to your PayPal account. Great job!"}
        </p>
      </>
    );
  } else if (status === "cancelled") {
    main = (
      <>
        <h5 className="mb5">Job cancelled</h5>
        <p className="text fz14 mb-0">
          ShortWorks decided the dispute for the client: the held payment was released and nobody
          was charged. See the decision in the activity below.
        </p>
      </>
    );
  } else if (status === "disputed") {
    main = (
      <>
        <h5 className="mb5 text-danger">This job is in dispute</h5>
        <p className="text fz14 mb15">
          The job and its payment are on hold. ShortWorks reviews the brief, the deliveries and the
          activity below, then either pays the freelancer in full or releases the payment to the client.
        </p>
        {disputeOpenedByMe && (
          <button
            type="button"
            className="ud-btn btn-light-thm"
            disabled={busy}
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Withdraw the dispute?",
                message: "The job comes off hold and goes back to where it was before the dispute.",
                confirmLabel: "Withdraw dispute",
              });
              if (ok) run("withdraw_dispute");
            }}
          >
            Withdraw dispute
          </button>
        )}
      </>
    );
  }

  return (
    <div className="bdr1 bdrs8 p30 mb30" style={{ backgroundColor: "#f8fbf9" }}>
      {main}

      {canDispute && form !== "dispute" && form !== "revision" && (
        <p className="fz13 text mt20 mb-0">
          Something wrong?{" "}
          <button type="button" className="btn btn-link p-0 fz13 text-danger align-baseline" onClick={() => setForm("dispute")}>
            Open a dispute
          </button>
        </p>
      )}
      {form === "dispute" && (
        <form
          className="mt20 pt20 bdrt1"
          onSubmit={(e) => {
            e.preventDefault();
            run("dispute", { reason, note });
          }}
        >
          <h5 className="mb5">Open a dispute</h5>
          <p className="text fz14 mb15">
            Try sorting it out with the other side first. A dispute puts the job on hold until
            support resolves it.
          </p>
          <select className="form-select mb10" value={reason} onChange={(e) => setReason(e.target.value)} required>
            <option value="">Pick a reason</option>
            {DISPUTE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {noteField("Describe the problem and what you'd like to happen.", true)}
          <div className="d-flex gap-2">
            <button type="submit" className="ud-btn btn-thm" disabled={busy}>
              Open dispute
            </button>
            <button type="button" className="ud-btn btn-light-thm" onClick={() => setForm(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-danger fz14 mt10 mb-0">{error}</p>}
    </div>
  );
}
