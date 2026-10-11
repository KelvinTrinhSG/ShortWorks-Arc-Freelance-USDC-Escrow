"use client";
import { confirmDialog } from "@/store/confirmStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Edit / Close or Reopen / Delete for the client who owns a project.
// Used in the Manage Projects table and on the project page.
export default function ProjectOwnerActions({ project, afterDelete, size = "sm" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const call = async (method, body) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    if (await call("PATCH", { status: project.status === "open" ? "closed" : "open" })) {
      router.refresh();
    }
  };

  const remove = async () => {
    const proposals = project.proposalCount
      ? `Its ${project.proposalCount} ${project.proposalCount === 1 ? "proposal" : "proposals"} will be deleted too. `
      : "";
    const ok = await confirmDialog({
      title: `Delete "${project.title}"?`,
      message: `${proposals}This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    if (await call("DELETE")) {
      if (afterDelete) router.push(afterDelete);
      else router.refresh();
    }
  };

  const btn = `btn btn-${size}`;
  return (
    <div>
      <div className="d-flex flex-wrap gap-2">
        <Link href={`/projects/${project.id}/edit`} className={`${btn} btn-outline-dark`}>
          Edit
        </Link>
        <button type="button" className={`${btn} btn-outline-secondary`} onClick={toggleStatus} disabled={busy}>
          {project.status === "open" ? "Close" : "Reopen"}
        </button>
        <button type="button" className={`${btn} btn-outline-danger`} onClick={remove} disabled={busy}>
          Delete
        </button>
      </div>
      {error && <p className="text-danger fz13 mt5 mb-0">{error}</p>}
    </div>
  );
}
