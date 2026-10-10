"use client";
import { COVER_LETTER_MAX } from "@/data/projectOptions";
import { parseVideoUrl } from "@/lib/videoUrl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// yyyy-mm-dd in the user's local time zone, for <input type="date">.
const toDateInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Short-form proposal: price per video, delivery date, cover letter and one
// optional sample. The freelancer's public profile is attached automatically.
// Pass `existing` (the freelancer's proposal) to edit it instead of sending a new one.
export default function ProposalForm({ project, username, existing, onDone, onCancel }) {
  const router = useRouter();
  const [form, setForm] = useState({
    pricePerVideo: String(existing?.pricePerVideo ?? project.budgetPerVideo),
    deliveryDate: existing?.deliveryDate ?? "",
    coverLetter: existing?.coverLetter ?? "",
    sampleUrl: existing?.sampleUrl ?? "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [today] = useState(() => toDateInput(new Date()));

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const price = Number(form.pricePerVideo) || 0;
  const total = Math.round(price * project.videoCount * 100) / 100;
  const diff = price - project.budgetPerVideo;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.sampleUrl.trim() && !parseVideoUrl(form.sampleUrl)) {
      setError("The sample video must be a TikTok, Reels, Shorts or Facebook link.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(
        existing ? `/api/proposals/${existing.id}` : `/api/projects/${project.id}/proposals`,
        {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sampleUrl: form.sampleUrl.trim() || null }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      // Re-render the server page, which now shows "Your proposal".
      router.refresh();
      onDone?.();
      setSending(false);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <form className="comments_form form-style1" onSubmit={handleSubmit}>
      <div className="row">
        <div className="col-md-6">
          <div className="mb20">
            <label className="fw500 ff-heading dark-color mb-2">
              Your price per video <span className="text-danger">*</span>
              <span className="fz13 text-muted fw400"> (USD)</span>
            </label>
            <input
              type="number"
              className="form-control"
              min={1}
              step={1}
              value={form.pricePerVideo}
              onChange={update("pricePerVideo")}
              required
            />
            {price > 0 && (
              <p className="fz14 mt5 mb0">
                <span className="text-thm">
                  Total: ${total} for {project.videoCount}{" "}
                  {project.videoCount === 1 ? "video" : "videos"}
                </span>
                {diff !== 0 && (
                  <span className="text-muted">
                    {` · $${Math.abs(diff)} ${diff > 0 ? "above" : "below"} the client's budget`}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb20">
            <label className="fw500 ff-heading dark-color mb-2">
              Delivery date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              className="form-control"
              min={today}
              max={project.deadline}
              value={form.deliveryDate}
              onChange={update("deliveryDate")}
              required
            />
            <p className="fz13 text-muted mt5 mb0">On or before the deadline.</p>
          </div>
        </div>
        <div className="col-md-12">
          <div className="mb20">
            <label className="fw500 ff-heading dark-color mb-2">
              Cover letter <span className="text-danger">*</span>
              <span className="fz13 text-muted fw400">
                {" "}
                ({form.coverLetter.length}/{COVER_LETTER_MAX})
              </span>
            </label>
            <textarea
              className="pt15"
              rows={6}
              maxLength={COVER_LETTER_MAX}
              value={form.coverLetter}
              onChange={update("coverLetter")}
              required
            />
            <p className="fz13 text-muted mt5 mb0">
              Why you fit this brief · how you would approach the videos ·
              anything you need from the client.
            </p>
          </div>
        </div>
        <div className="col-md-12">
          <div className="mb20">
            <label className="fw500 ff-heading dark-color mb-2">
              Most relevant sample video
              <span className="fz13 text-muted fw400"> (optional)</span>
            </label>
            <input
              type="url"
              className="form-control"
              value={form.sampleUrl}
              onChange={update("sampleUrl")}
            />
            <p className="fz13 text-muted mt5 mb0">
              A TikTok, Reels, Shorts or Facebook link closest to this project.
              Your{" "}
              <Link href={`/talents/${encodeURIComponent(username)}`} className="text-thm">
                public profile and portfolio
              </Link>{" "}
              are attached automatically.
            </p>
          </div>
        </div>
        {error && (
          <div className="col-md-12">
            <p className="text-danger fz14 mb15">{error}</p>
          </div>
        )}
        <div className="col-md-12">
          <div className="d-flex gap-2">
            <button type="submit" className="ud-btn btn-thm flex-grow-1" disabled={sending}>
              {sending ? "Saving..." : existing ? "Save Changes" : "Send Proposal"}
              <i className="fal fa-arrow-right-long" />
            </button>
            {onCancel && (
              <button type="button" className="ud-btn btn-light-thm" onClick={onCancel} disabled={sending}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
