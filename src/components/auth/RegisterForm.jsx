"use client";
import authStore from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Asks the server whether `value` is already taken, 400ms after the user stops typing.
function useIsTaken(field, value) {
  const query = value.trim();
  const [result, setResult] = useState({ query: "", taken: false });

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-availability?${field}=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setResult({ query, taken: Boolean(data[field]) });
      } catch {
        // Aborted or offline: the submit still catches duplicates.
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [field, query]);

  // Ignore answers for an older value while the user keeps typing.
  return result.query === query && result.taken;
}

export default function RegisterForm() {
  const login = authStore((state) => state.login);
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const usernameTaken = useIsTaken("username", form.username);
  const emailTaken = useIsTaken("email", form.email);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      login();
      router.push("/");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb25">
        <label className="form-label fw500 dark-color">Display Name</label>
        <input
          type="text"
          className="form-control"
          value={form.displayName}
          onChange={update("displayName")}
          required
        />
      </div>
      <div className="mb25">
        <label className="form-label fw500 dark-color">Username</label>
        <input
          type="text"
          className={`form-control ${usernameTaken ? "is-invalid" : ""}`}
          value={form.username}
          onChange={update("username")}
          required
        />
        {usernameTaken && (
          <p className="text-danger fz14 mt5 mb0">
            This username is already taken.
          </p>
        )}
      </div>
      <div className="mb25">
        <label className="form-label fw500 dark-color">Email</label>
        <input
          type="email"
          className={`form-control ${emailTaken ? "is-invalid" : ""}`}
          value={form.email}
          onChange={update("email")}
          required
        />
        {emailTaken && (
          <p className="text-danger fz14 mt5 mb0">
            An account with this email already exists.{" "}
            <Link href="/login" className="text-thm">
              Log in?
            </Link>
          </p>
        )}
      </div>
      <div className="mb15">
        <label className="form-label fw500 dark-color">Password</label>
        <input
          type="password"
          className="form-control"
          value={form.password}
          onChange={update("password")}
          required
        />
      </div>
      {error && <p className="text-danger fz14 mb15">{error}</p>}
      <div className="d-grid mb20">
        <button
          className="ud-btn btn-thm default-box-shadow2"
          type="submit"
          disabled={loading || usernameTaken || emailTaken}
        >
          {loading ? "Creating account..." : "Create Account"}{" "}
          <i className="fal fa-arrow-right-long" />
        </button>
      </div>
    </form>
  );
}
