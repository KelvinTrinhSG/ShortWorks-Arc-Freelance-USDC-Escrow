"use client";
import authStore from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Close account: confirms with the password, then logs out and goes home.
export default function ConfirmPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        "Close your account? Your profile and portfolio will be deleted permanently.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      // The server already cleared the cookie; just reset the UI state.
      authStore.setState({ user: null, checked: true });
      router.push("/");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="ps-widget bgc-white bdrs4 p30 mb30 overflow-hidden position-relative">
        <div className="col-lg-7">
          <div className="row">
            <div className="bdrb1 pb15 mb25">
              <h5 className="list-title">Close account</h5>
            </div>
            <form className="form-style1" onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-sm-12">
                  <p className="text">
                    Warning: closing your account permanently deletes your
                    profile and portfolio. This cannot be undone.
                  </p>
                </div>
                <div className="col-sm-6">
                  <div className="mb20">
                    <label className="heading-color ff-heading fw500 mb10">
                      Enter Password
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && <p className="text-danger fz14 mb15">{error}</p>}
                  <div className="text-start">
                    <button
                      type="submit"
                      className="ud-btn btn-thm"
                      disabled={busy}
                    >
                      {busy ? "Closing..." : "Close Account"}
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
