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
import Image from "next/image";
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

export default function TalentProfile() {
  const [profile, setProfile] = useState(initialProfile);
  const [videos, setVideos] = useState([]);
  const [avatarError, setAvatarError] = useState("");
  const [notice, setNotice] = useState("");

  const set = (field) => (value) =>
    setProfile((prev) => ({ ...prev, [field]: value }));
  const setFromInput = (field) => (e) => set(field)(e.target.value);

  // Fill in what the account already has. The rest has no backend yet.
  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then(({ user }) => {
        if (!user) return;
        setProfile((prev) => ({
          ...prev,
          displayName: prev.displayName || user.displayName,
          username: user.username,
          email: user.email,
        }));
      })
      .catch(() => {});
  }, []);

  const handleAvatar = (e) => {
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
    set("avatarUrl")(URL.createObjectURL(file));
  };

  const checks = requiredChecks(profile, videos);
  const doneCount = checks.filter((c) => c.done).length;
  const missing = checks.filter((c) => !c.done);

  const handleSave = () => {
    // TODO: send to PATCH /api/profile and /api/profile/videos once they exist.
    setNotice(
      missing.length
        ? `Saving is not connected yet. Still missing: ${missing
            .map((c) => c.label)
            .join(", ")}.`
        : "Saving is not connected yet. Your profile is complete, but nothing was stored.",
    );
  };

  return (
    <>
      {/* Completion */}
      <div className="ps-widget bgc-white bdrs4 p30 mb30">
        <div className="d-flex justify-content-between align-items-center mb10">
          <h5 className="list-title mb-0">Profile completion</h5>
          <span className="fw500">
            {doneCount}/{checks.length}
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
                onClick={() => set("avatarUrl")(null)}
              >
                <span className="flaticon-delete text-thm2" />
              </a>
              <label>
                <input
                  type="file"
                  accept=".png, .jpg, .jpeg"
                  className="d-none"
                  onChange={handleAvatar}
                />
                <a className="upload-btn ml10">
                  Upload photo <span className="text-danger">*</span>
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
            <div className="col-sm-6">
              <div className="mb20">
                <Label hint="(needed before your first job)">
                  PayPal email
                </Label>
                <input
                  type="email"
                  className="form-control"
                  value={profile.paypalEmail}
                  onChange={setFromInput("paypalEmail")}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb30">
        {notice && <p className="text-danger fz14 mb15">{notice}</p>}
        <button type="button" className="ud-btn btn-thm" onClick={handleSave}>
          Save Profile <i className="fal fa-arrow-right-long" />
        </button>
      </div>
    </>
  );
}
