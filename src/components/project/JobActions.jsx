"use client";
import { arcByChainId } from "@/data/arc";
import ESCROW_ABI from "@/data/arcEscrowAbi.json";
import { DISPUTE_REASONS, JOB_NOTE_MAX } from "@/data/projectOptions";
import { connectWallet, getEthereum, sendTransaction, switchToArc, waitForTransaction, walletErrorMessage } from "@/lib/metamask";
import { confirmDialog } from "@/store/confirmStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { encodeFunctionData } from "viem";

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// The "next step" box on /jobs/{id}: what the viewer can do now, by role and status.
// Every action goes to POST /api/jobs/{id}; the page re-renders with the new status.
// `arc`: the job's USDC escrow on Arc ({ escrow, escrowJobId, clientWallet, chainId, amount,
// platformFee }), when it was paid that way and the money is still held.
export default function JobActions({
  jobId,
  role,
  status,
  videoCount,
  total,
  freelancerName,
  autoApproveAt,
  disputeOpenedByMe,
  paymentMethod,
  arc,
}) {
  const paidTo = paymentMethod === "arc" ? "Arc wallet" : "PayPal account";
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

  // Arc: the client releases the escrow from the wallet that paid, then the server checks the transaction.
  const approveOnArc = async () => {
    setBusy(true);
    setError("");
    try {
      const eth = getEthereum();
      const from = await connectWallet(eth);
      if (from.toLowerCase() !== arc.clientWallet.toLowerCase()) {
        throw new Error(`Switch MetaMask to the wallet you paid from (${short(arc.clientWallet)}) and try again.`);
      }
      await switchToArc(eth, arcByChainId(arc.chainId));
      const hash = await sendTransaction(eth, {
        from,
        to: arc.escrow,
        data: encodeFunctionData({ abi: ESCROW_ABI, functionName: "release", args: [BigInt(arc.escrowJobId)] }),
      });
      await waitForTransaction(eth, hash);
      await run("approve", { txHash: hash });
    } catch (err) {
      setError(walletErrorMessage(err));
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
            {arc ? (
              <>
                <strong>{arc.amount} USDC</strong> from the escrow to {freelancerName} (you confirm it in MetaMask).
              </>
            ) : (
              <>
                <strong>${total}</strong> to {freelancerName} through PayPal.
              </>
            )}
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
                  message: arc
                    ? `The escrow pays ${Math.round((arc.amount - arc.platformFee) * 100) / 100} USDC to ${freelancerName} and ${arc.platformFee} USDC platform fee. MetaMask asks you to confirm. This completes the job; you can't request changes afterwards.`
                    : `$${total} will be paid to ${freelancerName} from the payment PayPal is holding. This completes the job; you can't request changes afterwards.`,
                  confirmLabel: "Approve & Complete",
                });
                if (ok) (arc ? approveOnArc() : run("approve"));
              }}
            >
              Approve & Complete
            </button>
            <button type="button" className="ud-btn btn-light-thm" disabled={busy} onClick={() => setForm("revision")}>
              Request changes
            </button>
          </div>
          {arc && (
            <p className="fz13 text mt10 mb-0">
              Can&apos;t use the wallet you paid from?{" "}
              <button
                type="button"
                className="btn btn-link p-0 fz13 align-baseline text-thm"
                disabled={busy}
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: "Approve without your wallet?",
                    message: `ShortWorks releases the escrow for you: ${freelancerName} is paid from the USDC held on Arc. This completes the job.`,
                    confirmLabel: "Approve & Complete",
                  });
                  if (ok) run("approve");
                }}
              >
                Approve and let ShortWorks release it
              </button>
            </p>
          )}
        </>
      );
  } else if (status === "submitted") {
    main = (
      <>
        <h5 className="mb5">🎉 Nice work, your videos are in!</h5>
        <p className="text fz14 mb-0">
          Now waiting for the client&apos;s review. They either approve (you&apos;re paid to your {paidTo}) or ask for changes. You&apos;ll get a notification either way.
          {autoApproveAt && <> No answer by {autoApproveAt}? It&apos;s approved and paid automatically.</>}
        </p>
      </>
    );
  } else if (status === "completed") {
    main = (
      <>
        <h5 className="mb5 text-success">🎉 Job completed</h5>
        <p className="text fz14 mb-0">
          {role === "client"
            ? "The work is approved and the freelancer is paid. Thanks for hiring on ShortWorks!"
            : `The work is approved and the payment went to your ${paidTo}. Great job!`}
        </p>
      </>
    );
  } else if (status === "cancelled") {
    main = (
      <>
        <h5 className="mb5">Job cancelled</h5>
        <p className="text fz14 mb-0">
          The held payment went back to the client, so nobody was charged. See why in the activity below.
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
