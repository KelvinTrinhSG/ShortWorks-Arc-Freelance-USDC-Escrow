"use client";
import { confirmDialog } from "@/store/confirmStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

// "Decline invitation" under the proposal form, for a freelancer the client invited.
export default function DeclineInviteButton({ projectId, clientName }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decline = async () => {
    const ok = await confirmDialog({
      title: "Decline this invitation?",
      message: `${clientName} will be notified and you'll go back to the projects list. You can still send a proposal later if you change your mind.`,
      confirmLabel: "Decline",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/invitations/decline`, { method: "POST" }).catch(
      () => null,
    );
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error || "Could not decline. Please try again.");
      setBusy(false);
      return;
    }
    // Done with this project: back to the list of open projects.
    router.push("/project-1");
  };

  return (
    <>
      <button
        type="button"
        className="ud-btn btn-white bdr1 btn-decline w-100"
        onClick={decline}
        disabled={busy}
      >
        {busy ? "Declining..." : "Decline invitation"}
      </button>
      {error && <p className="text-danger fz14 mt10 mb-0">{error}</p>}
    </>
  );
}
