"use client";
import {
  MAX_VIDEOS,
  MIN_VIDEOS,
  NICHES,
  PLATFORMS,
  VIDEO_ROLES,
} from "@/data/talentOptions";
import { useState } from "react";
import Select from "./Select";
import { parseVideoUrl } from "./videoUrl";

const emptyDraft = { url: "", niche: undefined, role: undefined, result: "" };
const labelOf = (options, value) =>
  options.find((o) => o.value === value)?.label;

export default function PortfolioEditor({ videos, onChange }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const full = videos.length >= MAX_VIDEOS;

  const addVideo = () => {
    const parsed = parseVideoUrl(draft.url);
    if (!parsed) {
      setError("Paste a TikTok, Instagram Reels, YouTube Shorts or Facebook link.");
      return;
    }
    if (!draft.niche) {
      setError("Pick the niche of this video.");
      return;
    }
    onChange([
      ...videos,
      {
        id: crypto.randomUUID(),
        url: draft.url.trim(),
        ...parsed,
        niche: draft.niche,
        role: draft.role ?? null,
        result: draft.result.trim(),
      },
    ]);
    setDraft(emptyDraft);
    setError("");
  };

  const remove = (id) => onChange(videos.filter((v) => v.id !== id));

  const move = (index, step) => {
    const next = [...videos];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    onChange(next);
  };

  return (
    <div className="ps-widget bgc-white bdrs4 p30 mb30 overflow-hidden position-relative">
      <div className="bdrb1 pb15 mb25 d-sm-flex justify-content-between align-items-center">
        <h5 className="list-title mb-0">
          Portfolio <span className="text-danger">*</span>
        </h5>
        <span
          className={`fz14 ${videos.length < MIN_VIDEOS ? "text-danger" : "text-thm"}`}
        >
          {videos.length}/{MAX_VIDEOS} videos · at least {MIN_VIDEOS} to be shown
          to clients
        </span>
      </div>

      {videos.length > 0 && (
        <div className="row mb20">
          {videos.map((video, i) => (
            <div key={video.id} className="col-6 col-md-4 col-xl-2 mb20">
              <div
                className="position-relative bdrs8 overflow-hidden bgc-thm4"
                style={{ aspectRatio: "9 / 16" }}
              >
                {video.embedUrl ? (
                  <iframe
                    src={video.embedUrl}
                    title={`Portfolio video ${i + 1}`}
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    style={{ width: "100%", height: "100%", border: 0 }}
                  />
                ) : (
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="d-flex h-100 align-items-center justify-content-center text-center p-2 fz14"
                  >
                    Open video ↗
                  </a>
                )}
              </div>
              <div className="mt10 fz14">
                <div className="fw500">
                  {labelOf(PLATFORMS, video.platform)} ·{" "}
                  {labelOf(NICHES, video.niche)}
                </div>
                {video.role && (
                  <div className="text-muted">
                    {labelOf(VIDEO_ROLES, video.role)}
                  </div>
                )}
                {video.result && <div className="text-thm">{video.result}</div>}
              </div>
              <div className="d-flex gap-1 mt5">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move left"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => move(i, 1)}
                  disabled={i === videos.length - 1}
                  aria-label="Move right"
                >
                  →
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger ms-auto"
                  onClick={() => remove(video.id)}
                  aria-label="Remove video"
                >
                  <span className="flaticon-delete" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {full ? (
        <p className="text mb-0">
          You have added the maximum of {MAX_VIDEOS} videos. Remove one to add
          another.
        </p>
      ) : (
        <div className="col-lg-9 form-style1">
          <h6 className="mb15">Add a video</h6>
          <div className="row">
            <div className="col-md-12">
              <div className="mb20">
                <label className="heading-color ff-heading fw500 mb10">
                  Video link <span className="text-danger">*</span>
                </label>
                <input
                  type="url"
                  className="form-control"
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
                <p className="fz13 text-muted mt5 mb0">
                  TikTok, Instagram Reels, YouTube Shorts or Facebook Reels.
                </p>
              </div>
            </div>
            <div className="col-sm-6 col-md-4">
              <div className="mb20">
                <Select
                  label="Niche"
                  required
                  options={NICHES}
                  value={draft.niche}
                  onChange={(niche) => setDraft({ ...draft, niche })}
                />
              </div>
            </div>
            <div className="col-sm-6 col-md-4">
              <div className="mb20">
                <Select
                  label="Your role"
                  options={VIDEO_ROLES}
                  value={draft.role}
                  onChange={(role) => setDraft({ ...draft, role })}
                />
              </div>
            </div>
            <div className="col-sm-12 col-md-4">
              <div className="mb20">
                <label className="heading-color ff-heading fw500 mb10">
                  Result
                </label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={60}
                  value={draft.result}
                  onChange={(e) =>
                    setDraft({ ...draft, result: e.target.value })
                  }
                />
                <p className="fz13 text-muted mt5 mb0">e.g. 1.2M views</p>
              </div>
            </div>
          </div>
          {error && <p className="text-danger fz14 mb15">{error}</p>}
          <button type="button" className="ud-btn btn-light-thm" onClick={addVideo}>
            Add video <i className="fal fa-plus" />
          </button>
        </div>
      )}
    </div>
  );
}
