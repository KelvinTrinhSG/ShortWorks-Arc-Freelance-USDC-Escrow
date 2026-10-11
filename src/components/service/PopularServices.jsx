"use client";
import { WORK_TYPES } from "@/data/projectOptions";
import Link from "next/link";
import { useEffect, useState } from "react";
import ServiceCard from "./ServiceCard";

const TABS = [{ value: "", label: "All" }, ...WORK_TYPES];
const SHOWN = 8;

// Home page "Popular Services": real services, most ordered first, by type of work.
export default function PopularServices() {
  const [tab, setTab] = useState("");
  const [result, setResult] = useState(null); // { tab, services } | { tab, error }
  const loading = result?.tab !== tab;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ sort: "popular" });
    if (tab) params.set("workType", tab);
    fetch(`/api/services?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data) => setResult({ tab, services: data.services.slice(0, SHOWN) }))
      .catch((err) => err.name !== "AbortError" && setResult({ tab, error: true }));
    return () => controller.abort();
  }, [tab]);

  const services = result?.services ?? [];

  return (
    <section className="pt-0 pb100">
      <div className="container">
        <div className="row align-items-center wow fadeInUp">
          <div className="col-xl-4">
            <div className="main-title mb30-lg">
              <h2 className="title">Popular Services</h2>
              <p className="paragraph">Ready-made offers from short-form video talent, most ordered first</p>
            </div>
          </div>
          <div className="col-xl-8">
            <div className="navpill-style2 at-home9 mb50-lg">
              <ul className="nav nav-pills mb20 justify-content-xl-end">
                {TABS.map((t) => (
                  <li key={t.value} className="nav-item">
                    <button
                      type="button"
                      onClick={() => setTab(t.value)}
                      className={`nav-link fw500 dark-color ${tab === t.value ? "active" : ""}`}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="row" style={{ opacity: loading && result ? 0.5 : 1 }}>
          {services.map((s) => (
            <div key={s.id} className="col-sm-6 col-xl-3 mb30">
              <ServiceCard service={s} />
            </div>
          ))}
          {!loading && !result?.error && services.length === 0 && (
            <div className="col-lg-12 text-center py-4">
              <p className="text mb-0">No services here yet. Freelancers can add one from their dashboard.</p>
            </div>
          )}
          {!loading && result?.error && (
            <p className="col-lg-12 text-center text-danger">Could not load services.</p>
          )}
          <div className="col-lg-12">
            <div className="text-center mt30">
              <Link className="ud-btn bdrs60 btn-light-thm" href={tab ? `/services?workType=${tab}` : "/services"}>
                All Services
                <i className="fal fa-arrow-right-long" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
