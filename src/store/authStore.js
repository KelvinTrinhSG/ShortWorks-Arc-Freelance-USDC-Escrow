import { useEffect } from "react";
import { create } from "zustand";

// The httpOnly session cookie is the source of truth. This store only mirrors
// it for the UI: who is logged in, their name and avatar for the header.
const authStore = create((set) => ({
  user: null,
  checked: false,
  // `user` is what /api/login, /api/register or /api/me returned.
  login: (user) => set({ user, checked: true }),
  // Merge changes after saving the profile, e.g. a new avatar or name.
  updateUser: (changes) =>
    set((state) => (state.user ? { user: { ...state.user, ...changes } } : {})),
  logout: async () => {
    set({ user: null, checked: true });
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
        authStore.setState({ user, checked: true });
      }
    })
    .catch(() => authStore.setState({ checked: true }));
  return sessionCheck;
};

// Starts as null on both server and client so the markup matches, then
// updates once /api/me answers.
export const useCurrentUser = () => {
  const user = authStore((state) => state.user);

  useEffect(() => {
    checkSession();
  }, []);

  return user;
};

export const useIsLoggedIn = () => Boolean(useCurrentUser());

export default authStore;
