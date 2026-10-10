"use client";
import { confirmDialog } from "@/store/confirmStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

// "Cancel invite" in the Invited list on the project page (owner only).
export default function CancelInviteButton({ projectId, username, displayName }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cancel = async () => {
    const ok = await confirmDialog({
      title: "Cancel this invitation?",
      message: `${displayName} will no longer see this project in their invitations.`,
      confirmLabel: "Cancel invite",
      cancelLabel: "Keep",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/invitations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error || "Could not cancel. Please try again.");
      setBusy(false);
      return;
    }
    router.refresh();
  };

  return (
    <span className="text-end">
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={cancel}
        disabled={busy}
      >
        {busy ? "Cancelling..." : "Cancel invite"}
      </button>
      {error && <span className="d-block text-danger fz13 mt5">{error}</span>}
    </span>
  );
}
