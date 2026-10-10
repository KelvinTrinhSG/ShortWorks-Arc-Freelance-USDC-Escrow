"use client";
import confirmStore, { closeConfirmDialog } from "@/store/confirmStore";
import { useEffect, useRef } from "react";

// Shows the dialog requested through confirmDialog() (store/confirmStore.js).
// Escape or a click on the backdrop cancels.
export default function ConfirmDialog() {
  const dialog = confirmStore((state) => state.dialog);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!dialog) return;
    confirmRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeConfirmDialog(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog]);

  if (!dialog) return null;

  return (
    <div
      className="confirm-dialog-backdrop d-flex align-items-center justify-content-center p-3"
      onMouseDown={(e) => e.target === e.currentTarget && closeConfirmDialog(false)}
    >
      <div
        className="confirm-dialog bgc-white bdrs12 p30"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="d-flex align-items-start gap-3">
          <span
            className={`confirm-dialog-icon flex-shrink-0 ${dialog.danger ? "is-danger" : ""}`}
            aria-hidden="true"
          >
            <i className={`fal ${dialog.danger ? "fa-triangle-exclamation" : "fa-circle-question"}`} />
          </span>
          <div>
            <h4 id="confirm-dialog-title" className="mb10">
              {dialog.title}
            </h4>
            {dialog.message && (
              <p id="confirm-dialog-message" className="text mb-0">
                {dialog.message}
              </p>
            )}
          </div>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2 mt30">
          <button
            type="button"
            className="ud-btn btn-white bdr1"
            onClick={() => closeConfirmDialog(false)}
          >
            {dialog.cancelLabel || "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`ud-btn ${dialog.danger ? "btn-danger-fill" : "btn-thm"}`}
            onClick={() => closeConfirmDialog(true)}
          >
            {dialog.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
