"use client";
import { VIDEO_LENGTHS, WORK_TYPES, estimateEarnings } from "@/data/projectOptions";
import {
  DELIVERY_DAYS,
  MAX_ORDER_VIDEOS,
  MAX_SAMPLES,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_TITLE_MAX,
} from "@/data/serviceOptions";
import { PLATFORMS, REVISIONS } from "@/data/talentOptions";
import { parseVideoUrl } from "@/lib/videoUrl";
import { useCurrentUser } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ChipSelect from "../dashboard/profile/ChipSelect";
import Select from "../dashboard/profile/Select";
import VideoFrame from "../project/VideoFrame";
import ServiceCard from "./ServiceCard";

const EMPTY = {
  title: "",
  workType: undefined,
  platforms: [],
  videoLength: undefined,
  description: "",
  pricePerVideo: "",
  deliveryDays: undefined,
  revisions: 1,
  maxVideos: "10",
  samples: [], // [{ url, platform, embedUrl }]
};

// Field -> error message, or nothing when the service can be published.
function validate(s) {
  const errors = {};
  const price = Number(s.pricePerVideo);
  const maxVideos = Number(s.maxVideos);
  if (!s.title.trim()) errors.title = "Give your service a title.";
  if (!s.workType) errors.workType = "Pick the type of work.";
  if (!s.platforms.length) errors.platforms = "Pick at least one platform.";
  if (!s.videoLength) errors.videoLength = "Pick the video length.";
  if (!s.description.trim()) errors.description = "Describe what the client gets.";
  if (!(price > 0)) errors.pricePerVideo = "Enter a price per video.";
  if (!s.deliveryDays) errors.deliveryDays = "Pick a delivery time.";
  if (!Number.isInteger(maxVideos) || maxVideos < 1 || maxVideos > MAX_ORDER_VIDEOS) {
    errors.maxVideos = `Enter 1–${MAX_ORDER_VIDEOS}.`;
  }
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

const FieldError = ({ message }) => (message ? <p className="text-danger fz14 mt5 mb0">{message}</p> : null);

// Add a service, or edit one when `serviceId` and `initial` are passed.
export default function ServiceForm({ serviceId, initial }) {
  const user = useCurrentUser();
  const router = useRouter();
  const [service, setService] = useState(initial ?? EMPTY);
  const [sampleUrl, setSampleUrl] = useState("");
  const [sampleError, setSampleError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (value) => {
    setService((prev) => ({ ...prev, [field]: value }));
    setNotice(null);
  };
  const setFromInput = (field) => (e) => set(field)(e.target.value);
  const errors = validate(service);
  const errorFor = (field) => (showErrors ? errors[field] : undefined);
  const earnings = estimateEarnings(Number(service.pricePerVideo) || 0);

  const addSample = () => {
    const parsed = parseVideoUrl(sampleUrl);
    if (!parsed) return setSampleError("Paste a TikTok, Instagram Reels, YouTube Shorts or Facebook link.");
    if (service.samples.some((s) => s.url === sampleUrl.trim())) return setSampleError("You already added this video.");
    set("samples")([...service.samples, { url: sampleUrl.trim(), ...parsed }]);
    setSampleUrl("");
    setSampleError("");
  };

  const save = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return setNotice({ ok: false, text: "Please fix the highlighted fields." });
    setSaving(true);
    try {
      const res = await fetch(serviceId ? `/api/services/${serviceId}` : "/api/services", {
        method: serviceId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...service,
          pricePerVideo: Number(service.pricePerVideo),
          maxVideos: Number(service.maxVideos),
          samples: service.samples.map((s) => s.url),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.push(`/services/${serviceId ?? data.id}`);
      router.refresh();
    } catch (err) {
      setNotice({ ok: false, text: err.message });
      setSaving(false);
    }
  };

  if (user && user.accountType !== "freelancer") {
    return (
      <div className="ps-widget bgc-white bdrs4 p30 mb30">
        <h5 className="mb10">Services are offered by freelancers</h5>
        <p className="text mb20">Your account is a client account. Browse services and order the one you need.</p>
        <Link href="/services" className="ud-btn btn-thm">
          Browse services <i className="fal fa-arrow-right-long" />
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
            <h5 className="list-title">What do you offer?</h5>
          </div>
          <div className="form-style1">
            <div className="mb20">
              <Label required hint={`(${service.title.length}/${SERVICE_TITLE_MAX})`}>
                Service title
              </Label>
              <input
                type="text"
                className="form-control"
                maxLength={SERVICE_TITLE_MAX}
                placeholder="e.g. I will edit 3 viral TikTok videos with captions and music"
                value={service.title}
                onChange={setFromInput("title")}
              />
              <FieldError message={errorFor("title")} />
            </div>
            <div className="row">
              <div className="col-sm-6 mb20">
                <Select label="Type of work" required options={WORK_TYPES} value={service.workType} onChange={set("workType")} />
                <FieldError message={errorFor("workType")} />
              </div>
              <div className="col-sm-6 mb20">
                <Select label="Video length" required options={VIDEO_LENGTHS} value={service.videoLength} onChange={set("videoLength")} />
                <FieldError message={errorFor("videoLength")} />
              </div>
            </div>
            <ChipSelect label="Platforms" required options={PLATFORMS} value={service.platforms} onChange={set("platforms")} />
            {errorFor("platforms") && (
              <div style={{ marginTop: -15 }} className="mb20">
                <FieldError message={errorFor("platforms")} />
              </div>
            )}
            <div className="mb10">
              <Label required hint={`(${service.description.length}/${SERVICE_DESCRIPTION_MAX})`}>
                Description
              </Label>
              <textarea
                rows={7}
                maxLength={SERVICE_DESCRIPTION_MAX}
                value={service.description}
                onChange={setFromInput("description")}
              />
              <p className="fz13 text-muted mt5 mb0">
                Say what&apos;s included (captions, music, hooks, color grading…), what you need from the
                client (footage, brand assets, script) and the file format you deliver.
              </p>
              <FieldError message={errorFor("description")} />
            </div>
          </div>
        </div>

        {/* Price & time */}
        <div className="ps-widget bgc-white bdrs4 p30 mb30">
          <div className="bdrb1 pb15 mb25">
            <h5 className="list-title">Price & delivery</h5>
          </div>
          <div className="row form-style1">
            <div className="col-sm-6 mb20">
              <Label required hint="(USD)">
                Price per video
              </Label>
              <input type="number" className="form-control" min={1} step={1} value={service.pricePerVideo} onChange={setFromInput("pricePerVideo")} />
              {earnings.amount > 0 && (
                <p className="fz13 text mt5 mb0">
                  You receive ≈ <strong className="dark-color">${earnings.net.toFixed(2)}</strong> per video after the
                  10% platform fee and PayPal&apos;s fee (for a 1-video order).
                </p>
              )}
              <FieldError message={errorFor("pricePerVideo")} />
            </div>
            <div className="col-sm-6 mb20">
              <Label required hint="(1–50)">
                Max videos per order
              </Label>
              <input type="number" className="form-control" min={1} max={MAX_ORDER_VIDEOS} step={1} value={service.maxVideos} onChange={setFromInput("maxVideos")} />
              <FieldError message={errorFor("maxVideos")} />
            </div>
            <div className="col-sm-6 mb20">
              <Select label="Delivery time (whole order)" required options={DELIVERY_DAYS} value={service.deliveryDays} onChange={set("deliveryDays")} />
              <FieldError message={errorFor("deliveryDays")} />
            </div>
            <div className="col-sm-6 mb20">
              <Select label="Free revisions" required options={REVISIONS} value={service.revisions} onChange={set("revisions")} />
            </div>
          </div>
        </div>

        {/* Quality */}
        <div className="ps-widget bgc-white bdrs4 p30 mb30">
          <div className="bdrb1 pb15 mb25 d-flex justify-content-between align-items-center">
            <h5 className="list-title mb-0">Sample videos</h5>
            <span className="fz14 text-muted">
              {service.samples.length}/{MAX_SAMPLES} · recommended
            </span>
          </div>
          <p className="text fz14 mb20">Show work like what the client will get. The first one is your cover.</p>
          {service.samples.length > 0 && (
            <div className="row mb10">
              {service.samples.map((s, i) => (
                <div key={s.url} className="col-6 col-md-4 mb20">
                  <VideoFrame url={s.url} embedUrl={s.embedUrl} title={`Sample ${i + 1}`} />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger mt10"
                    onClick={() => set("samples")(service.samples.filter((x) => x.url !== s.url))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {service.samples.length < MAX_SAMPLES && (
            <div className="form-style1">
              <div className="d-flex gap-2 align-items-start">
                <input
                  type="url"
                  className="form-control"
                  aria-label="Sample video link"
                  value={sampleUrl}
                  onChange={(e) => setSampleUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSample();
                    }
                  }}
                />
                <button type="button" className="ud-btn btn-light-thm text-nowrap" onClick={addSample}>
                  Add <i className="fal fa-plus" />
                </button>
              </div>
              <p className="fz13 text-muted mt5 mb0">TikTok, Instagram Reels, YouTube Shorts or Facebook Reels link.</p>
              {sampleError && <p className="text-danger fz14 mt5 mb0">{sampleError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Live preview + save */}
      <div className="col-xl-4">
        <div className="ps-widget bgc-white bdrs4 p30 mb30" style={{ position: "sticky", top: 100 }}>
          <h5 className="list-title mb15">How clients will see it</h5>
          <ServiceCard
            service={{ ...service, coverEmbedUrl: service.samples[0]?.embedUrl }}
            freelancer={user && { displayName: user.displayName, avatarUrl: user.avatarUrl }}
          />
          {notice && <p className={`fz14 mt20 mb0 ${notice.ok ? "text-success" : "text-danger"}`}>{notice.text}</p>}
          <button type="button" className="ud-btn btn-thm w-100 mt20" onClick={save} disabled={saving}>
            {saving ? "Saving..." : serviceId ? "Save Changes" : "Publish Service"} <i className="fal fa-arrow-right-long" />
          </button>
          <p className="fz13 text mt15 mb-0">
            Clients can only order once your <Link href="/paypal" className="text-thm">PayPal is connected</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
