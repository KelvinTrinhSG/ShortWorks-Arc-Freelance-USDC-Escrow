"use client";
import { REVISIONS, labelOf } from "@/data/talentOptions";
import { confirmDialog } from "@/store/confirmStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// The freelancer's services on /my-services: Edit · Pause/Resume · Delete.
export default function ManageServices({ services }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null); // service id
  const [error, setError] = useState("");

  const call = async (id, init) => {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/services/${id}`, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (s) =>
    call(s.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s.status === "active" ? "paused" : "active" }),
    });

  const remove = async (s) => {
    const ok = await confirmDialog({
      title: "Delete this service?",
      message: `"${s.title}" disappears from the services page.${s.orderCount ? ` Its ${s.orderCount} ${s.orderCount === 1 ? "order stays" : "orders stay"} in Jobs.` : ""}`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) call(s.id, { method: "DELETE" });
  };

  if (!services.length) {
    return (
      <div className="text-center py-4">
        <p className="text mb20">You don&apos;t offer any services yet.</p>
        <Link href="/services/new" className="ud-btn btn-thm">
          Add your first service <i className="fal fa-arrow-right-long" />
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && <p className="text-danger fz14">{error}</p>}
      <div className="packages_table table-responsive">
        <table className="table-style3 table at-savesearch">
          <thead className="t-head">
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Price</th>
              <th scope="col">Orders</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="t-body">
            {services.map((s) => (
              <tr key={s.id}>
                <th scope="row">
                  <Link href={`/services/${s.id}`} className="dark-color fw500">
                    {s.title}
                  </Link>
                  <p className="fz14 text mb-0">
                    {s.deliveryDays}-day delivery · {labelOf(REVISIONS, s.revisions)} · up to {s.maxVideos} videos
                  </p>
                </th>
                <td className="vam">${s.pricePerVideo}/video</td>
                <td className="vam">{s.orderCount}</td>
                <td className="vam">
                  <span className={`badge rounded-pill fw500 ${s.status === "active" ? "bg-success" : "bg-secondary"}`}>
                    {s.status === "active" ? "Active" : "Paused"}
                  </span>
                </td>
                <td className="vam">
                  <div className="d-flex flex-wrap gap-2">
                    <Link href={`/services/${s.id}/edit`} className="btn btn-sm btn-outline-dark">
                      Edit
                    </Link>
                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy === s.id} onClick={() => setStatus(s)}>
                      {s.status === "active" ? "Pause" : "Resume"}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy === s.id} onClick={() => remove(s)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
