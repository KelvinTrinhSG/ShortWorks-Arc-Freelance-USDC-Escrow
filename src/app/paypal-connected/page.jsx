"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// Where PayPal sends the connect popup back (via /api/paypal/onboard/return):
// tell the PayPal page and close. Opened in a normal tab, it links back to /paypal.
function Result() {
  const params = useSearchParams();
  const error = params.get("error");
  const status = params.get("status");

  useEffect(() => {
    if (!window.opener) return;
    window.opener.postMessage({ type: "paypal-connected", status, error }, window.location.origin);
    window.close();
  }, [status, error]);

  return (
    <div className="text-center py-5 px-3">
      <h4 className="mb10">{error ? "PayPal connection failed" : "PayPal connected"}</h4>
      <p className="text mb20">{error || "You can close this window."}</p>
      <Link href="/paypal" className="ud-btn btn-thm">
        Back to PayPal settings
      </Link>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Result />
    </Suspense>
  );
}
