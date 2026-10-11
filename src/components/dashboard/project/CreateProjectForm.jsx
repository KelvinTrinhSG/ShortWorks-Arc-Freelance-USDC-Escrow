"use client";
import {
  BRIEF_MAX,
  MAX_REFERENCES,
  MAX_VIDEO_COUNT,
  MIN_VIDEO_COUNT,
  PROJECT_TITLE_MAX,
  VIDEO_LENGTHS,
  WORK_TYPES,
} from "@/data/projectOptions";
import { PLATFORMS } from "@/data/talentOptions";
import { parseVideoUrl } from "@/lib/videoUrl";
import { useCurrentUser } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProjectCard from "../../project/ProjectCard";
import ChipSelect from "../profile/ChipSelect";
import Select from "../profile/Select";

const initialProject = {
  title: "",
  platforms: [],
  workType: undefined,
  videoCount: "",
  videoLength: undefined,
  brief: "",
  deadline: "",
  budgetPerVideo: "",
  references: [], // [{ url, platform, embedUrl }]
};

// yyyy-mm-dd for <input type="date">, in the user's local time zone.
const toDateInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Field -> error message, or nothing when the project is ready to publish.
function validate(p, minDeadline) {
  const errors = {};
  const count = Number(p.videoCount);
  const budget = Number(p.budgetPerVideo);
  if (!p.title.trim()) errors.title = "Give your project a title.";
  if (!p.platforms.length) errors.platforms = "Pick at least one platform.";
  if (!p.workType) errors.workType = "Pick the type of work.";
  if (!Number.isInteger(count) || count < MIN_VIDEO_COUNT || count > MAX_VIDEO_COUNT) {
    errors.videoCount = `Enter ${MIN_VIDEO_COUNT}–${MAX_VIDEO_COUNT} videos.`;
  }
  if (!p.videoLength) errors.videoLength = "Pick the video length.";
  if (!p.brief.trim()) errors.brief = "Describe what you need.";
  if (!p.deadline) errors.deadline = "Pick a deadline.";
  else if (p.deadline < minDeadline) errors.deadline = "The deadline must be tomorrow or later.";
  if (!(budget > 0)) errors.budgetPerVideo = "Enter a budget per video.";
  return errors;
}

function Label({ children, required, hint }) {
  return (
    <label className="heading-color ff-heading fw500 mb10 d-block">
      {children}
      {required && <span className="text-danger"> *</span>}
      {hint && <span className="fz13 text-muted fw400"> {hint}</span>}
    </label>
  );
}

const FieldError = ({ message }) =>
  message ? <p className="text-danger fz14 mt5 mb0">{message}</p> : null;

// Pass `projectId` and `initial` to edit an existing project instead of creating one.
export default function CreateProjectForm({ projectId, initial }) {
  const user = useCurrentUser();
  const [project, setProject] = useState(initial ?? initialProject);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState(null); // { ok: boolean, text: string }
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();
  const [minDeadline] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toDateInput(tomorrow);
  });

  const set = (field) => (value) => {
    setProject((prev) => ({ ...prev, [field]: value }));
    setNotice(null);
  };
  const setFromInput = (field) => (e) => set(field)(e.target.value);

  const errors = validate(project, minDeadline);
  const errorFor = (field) => (showErrors ? errors[field] : undefined);

  const count = Number(project.videoCount) || 0;
  const perVideo = Number(project.budgetPerVideo) || 0;
  const total = Math.round(count * perVideo * 100) / 100;

  const addReference = () => {
    const parsed = parseVideoUrl(referenceUrl);
    if (!parsed) {
      setReferenceError("Paste a TikTok, Instagram Reels, YouTube Shorts or Facebook link.");
      return;
    }
    if (project.references.some((r) => r.url === referenceUrl.trim())) {
      setReferenceError("You already added this video.");
      return;
    }
    set("references")([...project.references, { url: referenceUrl.trim(), ...parsed }]);
    setReferenceUrl("");
    setReferenceError("");
  };

  const handlePublish = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length) {
      setNotice({ ok: false, text: "Please fix the highlighted fields." });
      return;
    }
    setPublishing(true);
    setNotice(null);
    try {
      const res = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
        method: projectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...project,
          videoCount: Number(project.videoCount),
          budgetPerVideo: Number(project.budgetPerVideo),
          references: project.references.map((r) => r.url),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.push(`/projects/${projectId ?? data.id}`);
      router.refresh();
    } catch (err) {
      setNotice({ ok: false, text: err.message });
      setPublishing(false);
    }
  };

  // Projects are posted by clients; freelancers browse and apply instead.
  if (user?.accountType === "freelancer") {
    return (
      <div className="ps-widget bgc-white bdrs4 p30 mb30">
        <h5 className="mb10">Projects are posted by clients</h5>
        <p className="text mb20">
          Your account is a freelancer account. Keep your profile up to date so
          clients can find you.
        </p>
        <Link href="/my-profile" className="ud-btn btn-thm">
          Go to My Profile <i className="fal fa-arrow-right-long" />
        </Link>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-xl-8">
        {/* Scope */}
        <div className="ps-widget bgc-white bdrs4 p30 mb30">
          <div className="bdrb1 pb15 mb25">
            <h5 className="list-title">What do you need?</h5>
          </div>
          <div className="form-style1">
            <div className="mb20">
              <Label required hint={`(${project.title.length}/${PROJECT_TITLE_MAX})`}>
                Project title
              </Label>
              <input
                type="text"
                className="form-control"
                maxLength={PROJECT_TITLE_MAX}
                value={project.title}
                onChange={setFromInput("title")}
              />
              <FieldError message={errorFor("title")} />
            </div>

            <ChipSelect
              label="Platforms"
              required
              options={PLATFORMS}
              value={project.platforms}
              onChange={set("platforms")}
            />
            {errorFor("platforms") && (
              <div style={{ marginTop: -15 }} className="mb20">
                <FieldError message={errorFor("platforms")} />
              </div>
            )}

            <div className="row">
              <div className="col-sm-6">
                <div className="mb20">
                  <Select
                    label="Type of work"
                    required
                    options={WORK_TYPES}
                    value={project.workType}
                    onChange={set("workType")}
                  />
                  <FieldError message={errorFor("workType")} />
                </div>
              </div>
              <div className="col-sm-6">
                <div className="mb20">
                  <Label required>Videos × length</Label>
                  <div className="d-flex align-items-start gap-2">
                    <input
                      type="number"
                      className="form-control"
                      style={{ maxWidth: 110 }}
                      min={MIN_VIDEO_COUNT}
                      max={MAX_VIDEO_COUNT}
                      step={1}
                      aria-label="Number of videos"
                      value={project.videoCount}
                      onChange={setFromInput("videoCount")}
                    />
                    <span className="fz17 dark-color" style={{ lineHeight: "55px" }}>
                      ×
                    </span>
                    <div className="flex-grow-1 no-label-select">
                      <Select
                        label=""
                        options={VIDEO_LENGTHS}
                        value={project.videoLength}
                        onChange={set("videoLength")}
                        placeholder="Length"
                      />
                    </div>
                  </div>
                  <FieldError message={errorFor("videoCount") || errorFor("videoLength")} />
                </div>
              </div>
            </div>

            <div className="mb10">
              <Label required hint={`(${project.brief.length}/${BRIEF_MAX})`}>
                Brief
              </Label>
              <textarea
                rows={7}
                maxLength={BRIEF_MAX}
                value={project.brief}
                onChange={setFromInput("brief")}
              />
              <p className="fz13 text-muted mt5 mb0">
                Include: the product and goal · key message and call to action ·
                who provides the footage · subtitles, music or voiceover · video
                language · links to brand assets.
              </p>
              <FieldError message={errorFor("brief")} />
            </div>
          </div>
        </div>

        {/* Time & cost */}
        <div className="ps-widget bgc-white bdrs4 p30 mb30">
          <div className="bdrb1 pb15 mb25">
            <h5 className="list-title">Deadline & budget</h5>
          </div>
          <div className="row form-style1">
            <div className="col-sm-6">
              <div className="mb20">
                <Label required>Deadline</Label>
                <input
                  type="date"
                  className="form-control"
                  min={minDeadline}
                  value={project.deadline}
                  onChange={setFromInput("deadline")}
                />
                <FieldError message={errorFor("deadline")} />
              </div>
            </div>
            <div className="col-sm-6">
              <div className="mb20">
                <Label required hint="(USD)">
                  Budget per video
                </Label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  step={1}
                  value={project.budgetPerVideo}
                  onChange={setFromInput("budgetPerVideo")}
                />
                {total > 0 && (
                  <p className="fz14 text-thm mt5 mb0">
                    Total: ${total} for {count} {count === 1 ? "video" : "videos"}
                  </p>
                )}
                <FieldError message={errorFor("budgetPerVideo")} />
              </div>
            </div>
          </div>
        </div>

        {/* Quality */}
        <div className="ps-widget bgc-white bdrs4 p30 mb30">
          <div className="bdrb1 pb15 mb25 d-flex justify-content-between align-items-center">
            <h5 className="list-title mb-0">Reference videos</h5>
            <span className="fz14 text-muted">
              {project.references.length}/{MAX_REFERENCES} · optional
            </span>
          </div>
          <p className="text fz14 mb20">
            Show freelancers the style you want. It is the fastest way to set
            the quality bar.
          </p>

          {project.references.length > 0 && (
            <div className="row mb10">
              {project.references.map((r, i) => (
                <div key={r.url} className="col-6 col-md-4 mb20">
                  <div className="bdrs8 overflow-hidden bgc-thm4" style={{ aspectRatio: "9 / 16" }}>
                    {r.embedUrl ? (
                      <iframe
                        src={r.embedUrl}
                        title={`Reference video ${i + 1}`}
                        loading="lazy"
                        allow="encrypted-media; picture-in-picture"
                        allowFullScreen
                        style={{ width: "100%", height: "100%", border: 0 }}
                      />
                    ) : (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-flex h-100 align-items-center justify-content-center"
                      >
                        Open video ↗
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger mt10"
                    onClick={() =>
                      set("references")(project.references.filter((x) => x.url !== r.url))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {project.references.length < MAX_REFERENCES && (
            <div className="form-style1">
              <div className="d-flex gap-2 align-items-start">
                <input
                  type="url"
                  className="form-control"
                  aria-label="Reference video link"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addReference();
                    }
                  }}
                />
                <button
                  type="button"
                  className="ud-btn btn-light-thm text-nowrap"
                  onClick={addReference}
                >
                  Add <i className="fal fa-plus" />
                </button>
              </div>
              <p className="fz13 text-muted mt5 mb0">
                TikTok, Instagram Reels, YouTube Shorts or Facebook Reels link.
              </p>
              {referenceError && <p className="text-danger fz14 mt5 mb0">{referenceError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Live preview + publish */}
      <div className="col-xl-4">
        <div className="ps-widget bgc-white bdrs4 p30 mb30" style={{ position: "sticky", top: 100 }}>
          <h5 className="list-title mb15">How freelancers will see it</h5>
          <ProjectCard project={project} />
          {notice && (
            <p className={`fz14 mt20 mb0 ${notice.ok ? "text-success" : "text-danger"}`}>
              {notice.text}
            </p>
          )}
          <button
            type="button"
            className="ud-btn btn-thm w-100 mt20"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? "Saving..." : projectId ? "Save Changes" : "Publish Project"}{" "}
            <i className="fal fa-arrow-right-long" />
          </button>
        </div>
      </div>
    </div>
  );
}
