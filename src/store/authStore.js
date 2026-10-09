import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Demo-only auth: no backend, the flag lives in localStorage.
const authStore = create(
  persist(
    (set) => ({
      isLoggedIn: false,
      login: () => set(() => ({ isLoggedIn: true })),
      logout: () => set(() => ({ isLoggedIn: false })),
    }),
    { name: "shortworks-auth", skipHydration: true },
  ),
);

// `persist` is undefined on the server, where there is no localStorage.
const subscribeHydration = (callback) =>
  authStore.persist?.onFinishHydration(callback) ?? (() => {});
const getHydrated = () => authStore.persist?.hasHydrated() ?? false;

// Read the stored flag after mount so server and client render the same markup.
export const useIsLoggedIn = () => {
  const isLoggedIn = authStore((state) => state.isLoggedIn);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydrated,
    () => false,
  );

  useEffect(() => {
    if (!getHydrated()) authStore.persist?.rehydrate();
  }, []);

  return hydrated && isLoggedIn;
};

export default authStore;
