"use client";
import { SERVICE_BRIEF_MAX } from "@/data/serviceOptions";
import Link from "next/link";
import { useState } from "react";
import HireAndPay from "../project/HireAndPay";

const formatDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Order box on /service-single/{id}. A client picks how many videos and writes a brief;
// the order is created (a private project + the freelancer's proposal), then PayPal
// holds the money and the order becomes a job (same flow as Hire & pay).
// `viewer`: "owner" | "client" | "freelancer" | "guest".
export default function ServiceOrderBox({ service, viewer }) {
  const s = service;
  const [videoCount, setVideoCount] = useState("1");
  const [brief, setBrief] = useState("");
  const [order, setOrder] = useState(null); // { proposalId, amount }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [today] = useState(() => Date.now());

  const count = Math.min(Math.max(Number(videoCount) || 0, 0), s.maxVideos);
  const total = Math.round(s.pricePerVideo * count * 100) / 100;
  const delivery = formatDate(new Date(today + s.deliveryDays * 86400000));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/services/${s.id}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoCount: count, brief }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't create the order.");
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const summary = (
    <>
      <p className="text mb-0 fz14">Price</p>
      <h3 className="mb5">
        ${s.pricePerVideo}
        <span className="fz15 text fw400"> / video</span>
      </h3>
      <p className="text fz14 mb20">
        ⏱ {s.deliveryDays}-day delivery · up to {s.maxVideos} videos per order
      </p>
    </>
  );

  if (viewer === "owner") {
    return (
      <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
        {summary}
        <p className="dark-color fw500 mb10">This is your service{s.status !== "active" && " (paused)"}.</p>
        <Link href={`/edit-service/${s.id}`} className="ud-btn btn-thm w-100">
          Edit service
        </Link>
      </div>
    );
  }

  let body;
  if (viewer === "guest") {
    body = (
      <>
        <Link href={`/login?next=${encodeURIComponent(`/service-single/${s.id}`)}`} className="ud-btn btn-thm w-100 mb10">
          Log in to order
        </Link>
        <Link href="/register?as=client" className="ud-btn btn-light-thm w-100">
          Join as a client
        </Link>
      </>
    );
  } else if (viewer === "freelancer") {
    body = <p className="text fz14 mb-0">Only client accounts can order services.</p>;
  } else if (!s.canOrder) {
    body = (
      <p className="text fz14 mb-0">
        {s.status !== "active"
          ? "This service is paused and not taking orders."
          : `${s.freelancer.displayName} hasn't connected PayPal yet, so this service can't be ordered right now.`}
      </p>
    );
  } else if (order) {
    // Step 2: pay. The PayPal window opens right away; the button reopens it.
    body = (
      <>
        <p className="dark-color fw500 mb5">
          Order ready: {count} {count === 1 ? "video" : "videos"} · ${order.amount}
        </p>
        <p className="text fz14 mb15">PayPal holds the money now; you&apos;re only charged when you approve the videos.</p>
        <HireAndPay
          autoOpen
          label={`Pay $${order.amount} with PayPal`}
          proposal={{
            id: order.proposalId,
            hire: { amount: order.amount, merchantId: s.freelancer.paypalMerchantId, blocker: null },
            freelancer: { displayName: s.freelancer.displayName },
          }}
        />
        <button type="button" className="btn btn-link p-0 fz14 mt10 d-block" onClick={() => setOrder(null)}>
          ← Change the order
        </button>
      </>
    );
  } else {
    // Step 1: what to order.
    body = (
      <form onSubmit={submit} className="form-style1">
        <label className="heading-color ff-heading fw500 mb10 d-block">Number of videos</label>
        <input
          type="number"
          className="form-control mb15"
          min={1}
          max={s.maxVideos}
          step={1}
          value={videoCount}
          onChange={(e) => setVideoCount(e.target.value)}
          required
        />
        <label className="heading-color ff-heading fw500 mb10 d-block">
          Your brief <span className="fz13 text-muted fw400">({brief.length}/{SERVICE_BRIEF_MAX})</span>
        </label>
        <textarea
          rows={5}
          maxLength={SERVICE_BRIEF_MAX}
          placeholder="Product, goal, key message, where the footage is, music / captions / language…"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          required
        />
        <div className="d-flex justify-content-between py-2 bdrb1 mt15">
          <span className="text">Delivery by</span>
          <span className="fw500 dark-color">{delivery}</span>
        </div>
        <div className="d-flex justify-content-between py-2 mb15">
          <span className="text">Total</span>
          <span className="fw600 dark-color fz17">${total}</span>
        </div>
        <button type="submit" className="ud-btn btn-thm w-100" disabled={busy || count < 1}>
          {busy ? "Creating order..." : `Continue ($${total})`} <i className="fal fa-arrow-right-long" />
        </button>
        <p className="fz13 text mt10 mb-0">
          Next you pay with PayPal. The money is held and only taken when you approve the videos.{" "}
          <Link href="/terms#payments" className="text-thm">
            How it works
          </Link>
        </p>
      </form>
    );
  }

  return (
    <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
      {summary}
      {body}
      {error && <p className="text-danger fz14 mt10 mb-0">{error}</p>}
    </div>
  );
}
