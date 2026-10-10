"use client";
import authStore from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Only follow same-site paths, so ?next= can't send users to another domain.
const safeRedirect = (path) =>
  typeof path === "string" && /^\/(?![/\\])/.test(path) ? path : "/";

export default function LoginForm({ redirectTo }) {
  const login = authStore((state) => state.login);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      login();
      router.push(safeRedirect(redirectTo));
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb20">
        <label className="form-label fw600 dark-color">Email Address</label>
        <input
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="mb15">
        <label className="form-label fw600 dark-color">Password</label>
        <input
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="checkbox-style1 d-block d-sm-flex align-items-center justify-content-between mb20">
        <label className="custom_checkbox fz14 ff-heading">
          Remember me
          <input type="checkbox" defaultChecked="checked" />
          <span className="checkmark" />
        </label>
        <a className="fz14 ff-heading">Lost your password?</a>
      </div>
      {error && <p className="text-danger fz14 mb15">{error}</p>}
      <div className="d-grid mb20">
        <button className="ud-btn btn-thm" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}{" "}
          <i className="fal fa-arrow-right-long" />
        </button>
      </div>
    </form>
  );
}
