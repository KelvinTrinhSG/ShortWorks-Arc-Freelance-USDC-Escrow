"use client";
import { useEffect, useRef, useState } from "react";

// Filter bar pieces shared by the talent and project directories.

// A filter button that opens a checkbox / radio list. Open state lives in React
// (not Bootstrap's dropdown JS, which lost track of it when the list re-rendered):
// a click outside or Escape closes it, so opening another filter closes this one.
export function FilterDropdown({ label, count, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li ref={ref} className="list-inline-item position-relative mb10">
      <button
        className={`open-btn dropdown-toggle ${count ? "fw600" : ""}`}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        {count ? ` (${count})` : ""}
        <i className="fa fa-angle-down ms-2" />
      </button>
      <div
        className={`dropdown-menu dd4 pb10 ${open ? "show" : ""}`}
        style={{ top: "100%", left: 0, marginTop: 4, zIndex: 1000 }}
      >
        <div className="widget-wrapper pr20">
          <div className="checkbox-style1">{children}</div>
        </div>
      </div>
    </li>
  );
}

export function FilterCheck({ label, checked, onChange, type = "checkbox" }) {
  return (
    <label className="custom_checkbox">
      {label}
      <input type={type} checked={checked} onChange={onChange} />
      <span className="checkmark" />
    </label>
  );
}
