"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProposalCard from "./ProposalCard";
import ProposalForm from "./ProposalForm";

// The freelancer's own proposal on a project page, with Edit and Withdraw
// while the client has not responded and the project is still open.
export default function MyProposal({ proposal, project, username, now }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canChange = proposal.status === "pending" && project.isOpen;

  const withdraw = async () => {
    if (!window.confirm("Withdraw your proposal? You can send a new one while the project is open.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <>
        <h4 className="mb20">Edit your proposal</h4>
        <ProposalForm
          project={project}
          username={username}
          existing={proposal}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </>
    );
  }

  const note = {
    accepted: "The client accepted your proposal.",
    declined: "The client declined this proposal.",
  }[proposal.status];

  return (
    <>
      <h4 className="mb20">Your proposal</h4>
      <ProposalCard
        proposal={proposal}
        videoCount={project.videoCount}
        now={now}
        actions={
          <>
            {note && <p className={`fz14 mb10 ${proposal.status === "accepted" ? "text-success" : "text-muted"}`}>{note}</p>}
            {proposal.status === "accepted" && (
              <Link href={`/manage-jobs/${proposal.id}`} className="btn btn-sm btn-dark">
                Open your job →
              </Link>
            )}
            {canChange && (
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setEditing(true)} disabled={busy}>
                  Edit
                </button>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={withdraw} disabled={busy}>
                  Withdraw
                </button>
              </div>
            )}
            {error && <p className="text-danger fz13 mt5 mb-0">{error}</p>}
          </>
        }
      />
    </>
  );
}
