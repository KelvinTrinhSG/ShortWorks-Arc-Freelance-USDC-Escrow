import { useEffect } from "react";
import { create } from "zustand";

// The httpOnly session cookie is the source of truth. This store only mirrors
// it for the UI, so the header can switch between "Sign in" and "Dashboard".
const authStore = create((set) => ({
  isLoggedIn: false,
  checked: false,
  login: () => set({ isLoggedIn: true, checked: true }),
  logout: async () => {
    set({ isLoggedIn: false, checked: true });
    await fetch("/api/logout", { method: "POST" });
  },
}));

// Ask the server once per page load whether the session cookie is valid.
let sessionCheck = null;
const checkSession = () => {
  sessionCheck ??= fetch("/api/me")
    .then((res) => res.json())
    .then(({ user }) => {
      // login()/logout() may have run while the request was in flight.
      if (!authStore.getState().checked) {
        authStore.setState({ isLoggedIn: Boolean(user), checked: true });
      }
    })
    .catch(() => authStore.setState({ checked: true }));
  return sessionCheck;
};

// Starts as false on both server and client so the markup matches, then
// updates once /api/me answers.
export const useIsLoggedIn = () => {
  const isLoggedIn = authStore((state) => state.isLoggedIn);

  useEffect(() => {
    checkSession();
  }, []);

  return isLoggedIn;
};

export default authStore;
