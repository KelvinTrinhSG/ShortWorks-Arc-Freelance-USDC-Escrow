"use client";
import authStore from "@/store/authStore";
import { useRouter } from "next/navigation";

// Demo login: marks the user as logged in and returns to the home page.
export default function LoginButton({ className, children }) {
  const login = authStore((state) => state.login);
  const router = useRouter();

  return (
    <button
      className={className}
      type="button"
      onClick={() => {
        login();
        router.push("/");
      }}
    >
      {children}
    </button>
  );
}
