"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Invite one freelancer to a project, or take the invitation back.
// `initial`: "proposed" (already sent a proposal), "declined", "invited", or null.
// `available`: false when the freelancer is not "Available for work"; they can't be newly
// invited, but an existing invitation still shows (and can be cancelled).
// `redirectAfterInvite`: go to the project page once invited (used on the talent profile).
export default function InviteButton({
  projectId,
  username,
  initial = null,
  available = true,
  redirectAfterInvite = false,
  onChange,
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (state === "proposed" || state === "declined") {
    return (
      <button type="button" className="ud-btn btn-light-thm w-100" disabled>
        {state === "proposed" ? "Proposal received ✓" : "Declined your invite"}
      </button>
    );
  }

  if (state === null && !available) {
    return (
      <button type="button" className="ud-btn btn-light-thm w-100" disabled>
        Not available for work
      </button>
    );
  }

  const send = async (method) => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/invitations`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error || "Something went wrong. Please try again.");
      return;
    }
    if (method === "POST" && redirectAfterInvite) {
      router.push(`/project-single/${projectId}`);
      return;
    }
    const next = method === "POST" ? "invited" : null;
    setState(next);
    onChange?.(username, next);
  };

  return (
    <>
      {state === "invited" ? (
        <div className="d-flex align-items-center justify-content-between gap-2">
          <span className="fw500 text-thm">Invited ✓</span>
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text"
            disabled={busy}
            onClick={() => send("DELETE")}
          >
            {busy ? "Cancelling..." : "Cancel invite"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="ud-btn btn-thm w-100"
          disabled={busy}
          onClick={() => send("POST")}
        >
          {busy ? "Inviting..." : "Invite to project"}
        </button>
      )}
      {error && <p className="text-danger fz13 mt5 mb-0">{error}</p>}
    </>
  );
}
