"use client";
import {
  AVAILABILITY,
  AVATAR_MAX_BYTES,
  BIO_MAX,
  COUNTRIES,
  HEADLINE_MAX,
  LANGUAGES,
  MAX_NICHES,
  MAX_ROLES,
  MIN_VIDEOS,
  NICHES,
  PLATFORMS,
  REVISIONS,
  ROLES,
  TIMEZONES,
  TOOLS,
  TURNAROUND,
} from "@/data/talentOptions";
import authStore, { useCurrentUser } from "@/store/authStore";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ChipSelect from "./ChipSelect";
import PortfolioEditor from "./PortfolioEditor";
import Select from "./Select";

const initialProfile = {
  avatarUrl: null,
  displayName: "",
  username: "",
  email: "",
  headline: "",
  roles: [],
  country: undefined,
  timezone: undefined,
  languages: [],
  availability: "available",
  bio: "",
  platforms: [],
  niches: [],
  tools: [],
  startingPrice: "",
  turnaroundHours: undefined,
  freeRevisions: undefined,
  phone: "",
  paypalEmail: "",
};

// The 10 required items a profile needs before it is shown to clients.
const requiredChecks = (p, videos) => [
  { label: "Profile photo", done: Boolean(p.avatarUrl) },
  { label: "Display name", done: p.displayName.trim() !== "" },
  { label: "Headline", done: p.headline.trim() !== "" },
  { label: "Main role", done: p.roles.length > 0 },
  { label: "Country & time zone", done: Boolean(p.country && p.timezone) },
  { label: `${MIN_VIDEOS} portfolio videos`, done: videos.length >= MIN_VIDEOS },
  { label: "Platforms", done: p.platforms.length > 0 },
  { label: "Niches", done: p.niches.length > 0 },
  { label: "Starting price", done: Number(p.startingPrice) > 0 },
  { label: "Delivery time", done: p.turnaroundHours !== undefined },
];

function Card({ title, children }) {
  return (
    <div className="ps-widget bgc-white bdrs4 p30 mb30 overflow-hidden position-relative">
      <div className="bdrb1 pb15 mb25">
        <h5 className="list-title">{title}</h5>
      </div>
      {children}
    </div>
  );
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

// API uses null for "not set"; the Select component uses undefined for that.
const fromApi = (p) => ({
  ...p,
  country: p.country ?? undefined,
  timezone: p.timezone ?? undefined,
  turnaroundHours: p.turnaroundHours ?? undefined,
  freeRevisions: p.freeRevisions ?? undefined,
  startingPrice: p.startingPrice === null ? "" : String(p.startingPrice),
});

const toApi = (p) => ({
  displayName: p.displayName,
  headline: p.headline,
  bio: p.bio,
  roles: p.roles,
  country: p.country ?? null,
  timezone: p.timezone ?? null,
  languages: p.languages,
  availability: p.availability,
  platforms: p.platforms,
  niches: p.niches,
  tools: p.tools,
  startingPrice: p.startingPrice === "" ? null : p.startingPrice,
  turnaroundHours: p.turnaroundHours ?? null,
  freeRevisions: p.freeRevisions ?? null,
  phone: p.phone,
  paypalEmail: p.paypalEmail,
});

// Center-crop and shrink to a 256x256 JPEG so uploads stay ~30KB.
async function resizeAvatar(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas
    .getContext("2d")
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

async function request(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export default function TalentProfile() {
  const updateUser = authStore((state) => state.updateUser);
  const isFreelancer = useCurrentUser()?.accountType === "freelancer";
  const [profile, setProfile] = useState(initialProfile);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [notice, setNotice] = useState(null); // { ok: boolean, text: string }

  const set = (field) => (value) =>
    setProfile((prev) => ({ ...prev, [field]: value }));
  const setFromInput = (field) => (e) => set(field)(e.target.value);

  // Load the saved profile every time the page opens, e.g. after logging in again.
  useEffect(() => {
    request("/api/profile")
      .then((data) => {
        setProfile(fromApi(data.profile));
        setVideos(data.videos);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setAvatarError("Use a .png or .jpg image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("The image must be 1MB or smaller.");
      return;
    }
    setAvatarError("");
    setAvatarBusy(true);
    try {
      const { avatarUrl } = await request("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: await resizeAvatar(file),
      });
      set("avatarUrl")(avatarUrl);
      updateUser({ avatarUrl });
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (!profile.avatarUrl || avatarBusy) return;
    setAvatarBusy(true);
    try {
      await request("/api/profile/avatar", { method: "DELETE" });
      set("avatarUrl")(null);
      updateUser({ avatarUrl: null });
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const checks = requiredChecks(profile, videos);
  const doneCount = checks.filter((c) => c.done).length;
  const missing = checks.filter((c) => !c.done);

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const saved = await request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApi(profile)),
      });
      const { videos: savedVideos } = await request("/api/profile/videos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videos: videos.map(({ url, niche, role, result }) => ({
            url,
            niche,
            role,
            result,
          })),
        }),
      });
      setProfile(fromApi(saved.profile));
      setVideos(savedVideos);
      updateUser({ displayName: saved.profile.displayName });
      setNotice({
        ok: true,
        text: missing.length
          ? `Saved. Complete ${missing.length} more to be shown to clients.`
          : "Saved. Your profile is complete.",
      });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ps-widget bgc-white bdrs4 p30 mb30">
        <p className="text mb-0">Loading your profile...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="ps-widget bgc-white bdrs4 p30 mb30">
        <p className="text-danger mb-0">{loadError}</p>
      </div>
    );
  }

  return (
    <>
      {/* Completion */}
      <div className="ps-widget bgc-white bdrs4 p30 mb30">
        <div className="d-flex justify-content-between align-items-center mb10">
          <h5 className="list-title mb-0">Profile completion</h5>
          <span className="d-flex align-items-center gap-3">
            {profile.username && (
              <Link
                href={`/freelancers/${encodeURIComponent(profile.username)}`}
                className="fz14 text-thm"
              >
                View public profile ↗
              </Link>
            )}
            <span className="fw500">
              {doneCount}/{checks.length}
            </span>
          </span>
        </div>
        <div className="progress mb15" style={{ height: 8 }}>
          <div
            className="progress-bar bgc-thm"
            style={{ width: `${(doneCount / checks.length) * 100}%` }}
          />
        </div>
        <p className="text mb-0 fz14">
          {missing.length
            ? `Complete ${missing.length} more to be shown to clients: ${missing
                .map((c) => c.label)
                .join(" · ")}`
            : "Your profile is complete and ready to be shown to clients."}
        </p>
      </div>

      {/* A. Identity */}
      <Card title="Profile">
        <div className="profile-box d-sm-flex align-items-center mb30">
          <div className="profile-img mb20-sm">
            <Image
              height={71}
              width={71}
              className="rounded-circle wa-xs"
              src={profile.avatarUrl || "/images/resource/default-avatar.svg"}
              style={{ height: "71px", width: "71px", objectFit: "cover" }}
              alt="profile"
              unoptimized
            />
          </div>
          <div className="profile-content ml20 ml0-xs">
            <div className="d-flex align-items-center my-3">
              <a
                className="tag-delt text-thm2"
                onClick={removeAvatar}
                role="button"
                aria-label="Remove photo"
              >
                <span className="flaticon-delete text-thm2" />
              </a>
              <label>
                <input
                  type="file"
                  accept=".png, .jpg, .jpeg"
                  className="d-none"
                  onChange={handleAvatar}
                  disabled={avatarBusy}
                />
                <a className="upload-btn ml10">
                  {avatarBusy ? "Uploading..." : "Upload photo"}{" "}
                  <span className="text-danger">*</span>
                </a>
              </label>
            </div>
            <p className="text mb-0">Max 1MB, .jpg or .png</p>
            {avatarError && (
              <p className="text-danger fz14 mb-0">{avatarError}</p>
            )}
          </div>
        </div>

        <div className="col-lg-9 form-style1">
          <div className="row">
            <div className="col-sm-6">
              <div className="mb20">
                <Label required>Display Name</Label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={100}
                  value={profile.displayName}
                  onChange={setFromInput("displayName")}
                />
              </div>
            </div>
            <div className="col-sm-6">
              <div className="mb20">
                <Label>Username</Label>
                <input
                  type="text"
                  className="form-control"
                  value={profile.username}
                  disabled
                />
              </div>
            </div>
            <div className="col-md-12">
              <div className="mb20">
                <Label
                  required
                  hint={`(${profile.headline.length}/${HEADLINE_MAX})`}
                >
                  Headline
                </Label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={HEADLINE_MAX}
                  value={profile.headline}
                  onChange={setFromInput("headline")}
                />
                <p className="fz13 text-muted mt5 mb0">
                  One line about what you make, e.g. &quot;TikTok editor for
                  F&amp;B brands that boosts retention&quot;
                </p>
              </div>
            </div>
            <div className="col-md-12">
              <ChipSelect
                label="Main role"
                required
                options={ROLES}
                value={profile.roles}
                onChange={set("roles")}
                max={MAX_ROLES}
              />
            </div>
            <div className="col-sm-6">
              <div className="mb20">
                <Select
                  label="Country"
                  required
                  options={COUNTRIES}
                  value={profile.country}
                  onChange={set("country")}
                />
              </div>
            </div>
            <div className="col-sm-6">
              <div className="mb20">
                <Select
                  label="Time zone"
                  required
                  options={TIMEZONES}
                  value={profile.timezone}
                  onChange={set("timezone")}
                />
              </div>
            </div>
            <div className="col-md-12">
              <ChipSelect
                label="Languages"
                options={LANGUAGES}
                value={profile.languages}
                onChange={set("languages")}
              />
            </div>
            <div className="col-sm-6">
              <div className="mb20">
                <Select
                  label="Availability"
                  options={AVAILABILITY}
                  value={profile.availability}
                  onChange={set("availability")}
                />
              </div>
            </div>
            <div className="col-md-12">
              <div className="mb10">
                <Label hint={`(${profile.bio.length}/${BIO_MAX})`}>
                  Short bio
                </Label>
                <textarea
                  rows={4}
                  maxLength={BIO_MAX}
                  value={profile.bio}
                  onChange={setFromInput("bio")}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* B. Portfolio */}
      <PortfolioEditor videos={videos} onChange={setVideos} />

      {/* C. Expertise */}
      <Card title="Expertise">
        <div className="col-lg-9">
          <ChipSelect
            label="Platforms"
            required
            options={PLATFORMS}
            value={profile.platforms}
            onChange={set("platforms")}
          />
          <ChipSelect
            label="Niches"
            required
            options={NICHES}
            value={profile.niches}
            onChange={set("niches")}
            max={MAX_NICHES}
          />
          <ChipSelect
            label="Tools"
            options={TOOLS}
            value={profile.tools}
            onChange={set("tools")}
          />
        </div>
      </Card>

      {/* D. Pricing & delivery */}
      <Card title="Pricing & Delivery">
        <div className="col-lg-9 form-style1">
          <div className="row">
            <div className="col-sm-4">
              <div className="mb20">
                <Label required hint="(USD / video)">
                  Starting price
                </Label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  step={1}
                  value={profile.startingPrice}
                  onChange={setFromInput("startingPrice")}
                />
              </div>
            </div>
            <div className="col-sm-4">
              <div className="mb20">
                <Select
                  label="Delivery time"
                  required
                  options={TURNAROUND}
                  value={profile.turnaroundHours}
                  onChange={set("turnaroundHours")}
                />
              </div>
            </div>
            <div className="col-sm-4">
              <div className="mb20">
                <Select
                  label="Free revisions"
                  options={REVISIONS}
                  value={profile.freeRevisions}
                  onChange={set("freeRevisions")}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Private */}
      <Card title="Private Information">
        <p className="text fz14 mb20">
          Only you can see this. It is never shown on your public profile.
        </p>
        <div className="col-lg-9 form-style1">
          <div className="row">
            <div className="col-sm-6">
              <div className="mb20">
                <Label>Email</Label>
                <input
                  type="email"
                  className="form-control"
                  value={profile.email}
                  disabled
                />
              </div>
            </div>
            <div className="col-sm-6">
              <div className="mb20">
                <Label>Phone number</Label>
                <input
                  type="tel"
                  className="form-control"
                  maxLength={30}
                  value={profile.phone}
                  onChange={setFromInput("phone")}
                />
              </div>
            </div>
          </div>
          {/* The old "PayPal email" field: payments now go through the connected account on /paypal. */}
          {isFreelancer && (
            <p className="fz14 text mb20">
              Getting paid: connect your PayPal account on the{" "}
              <Link href="/paypal" className="text-thm">
                PayPal
              </Link>{" "}
              page.
            </p>
          )}
        </div>
      </Card>

      <div className="mb30">
        {notice && (
          <p className={`fz14 mb15 ${notice.ok ? "text-success" : "text-danger"}`}>
            {notice.text}
          </p>
        )}
        <button
          type="button"
          className="ud-btn btn-thm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Profile"}{" "}
          <i className="fal fa-arrow-right-long" />
        </button>
      </div>
    </>
  );
}
