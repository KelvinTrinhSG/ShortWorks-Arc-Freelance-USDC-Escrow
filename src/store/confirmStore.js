import { create } from "zustand";

// The site's confirm dialog, used instead of window.confirm.
//   if (!(await confirmDialog({ title: "Delete project?", message: "...", confirmLabel: "Delete", danger: true }))) return;
// Rendered once by <ConfirmDialog /> in app/layout.js.
const confirmStore = create(() => ({ dialog: null })); // { title, message, confirmLabel, cancelLabel, danger, resolve }

export function confirmDialog(options) {
  return new Promise((resolve) => {
    // A dialog that is still open counts as cancelled.
    confirmStore.getState().dialog?.resolve(false);
    confirmStore.setState({ dialog: { ...options, resolve } });
  });
}

export function closeConfirmDialog(answer) {
  const { dialog } = confirmStore.getState();
  if (!dialog) return;
  confirmStore.setState({ dialog: null });
  dialog.resolve(answer);
}

export default confirmStore;
