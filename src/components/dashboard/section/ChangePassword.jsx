"use client";
import { useState } from "react";

const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePassword() {
  const [form, setForm] = useState(empty);
  const [notice, setNotice] = useState(null); // { ok: boolean, text: string }
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setNotice({ ok: false, text: "The new passwords do not match." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setForm(empty);
      setNotice({ ok: true, text: "Your password has been changed." });
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="ps-widget bgc-white bdrs4 p30 mb30 overflow-hidden position-relative">
        <div className="bdrb1 pb15 mb25">
          <h5 className="list-title">Change password</h5>
        </div>
        <div className="col-lg-7">
          <div className="row">
            <form className="form-style1" onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-sm-6">
                  <div className="mb20">
                    <label className="heading-color ff-heading fw500 mb10">
                      Old Password
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      autoComplete="current-password"
                      value={form.currentPassword}
                      onChange={update("currentPassword")}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-sm-12">
                  <div className="mb20">
                    <label className="heading-color ff-heading fw500 mb10">
                      New Password
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      autoComplete="new-password"
                      minLength={8}
                      value={form.newPassword}
                      onChange={update("newPassword")}
                      required
                    />
                    <p className="fz13 text-muted mt5 mb0">
                      At least 8 characters.
                    </p>
                  </div>
                </div>
                <div className="col-sm-12">
                  <div className="mb20">
                    <label className="heading-color ff-heading fw500 mb10">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={update("confirmPassword")}
                      required
                    />
                  </div>
                </div>
                {notice && (
                  <div className="col-md-12">
                    <p
                      className={`fz14 mb15 ${notice.ok ? "text-success" : "text-danger"}`}
                    >
                      {notice.text}
                    </p>
                  </div>
                )}
                <div className="col-md-12">
                  <div className="text-start">
                    <button
                      type="submit"
                      className="ud-btn btn-thm"
                      disabled={saving}
                    >
                      {saving ? "Changing..." : "Change Password"}
                      <i className="fal fa-arrow-right-long" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
