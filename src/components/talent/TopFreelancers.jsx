"use client";
import { ROLES } from "@/data/talentOptions";
import Link from "next/link";
import { useEffect, useState } from "react";
import TalentCard from "./TalentCard";

const TABS = [{ value: "", label: "All" }, ...ROLES];
const SHOWN = 4;

// Home page "Top Freelancers": most jobs completed on ShortWorks (no ratings yet),
// then complete and available profiles. Filtered by role.
export default function TopFreelancers() {
  const [tab, setTab] = useState("");
  const [result, setResult] = useState(null); // { tab, talents } | { tab, error }
  const loading = result?.tab !== tab;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ sort: "top" });
    if (tab) params.set("role", tab);
    fetch(`/api/talents?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data) => setResult({ tab, talents: data.talents.slice(0, SHOWN) }))
      .catch((err) => err.name !== "AbortError" && setResult({ tab, error: true }));
    return () => controller.abort();
  }, [tab]);

  const talents = result?.talents ?? [];

  return (
    <section className="pb90 pb30-md">
      <div className="container">
        <div className="row align-items-center wow fadeInUp">
          <div className="col-xl-4">
            <div className="main-title mb30-lg">
              <h2 className="title">Top Freelancers</h2>
              <p className="paragraph">Short-form video talent with the most jobs completed on ShortWorks</p>
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
          {talents.map((t) => (
            <div key={t.username} className="col-sm-6 col-xl-3 mb30">
              <TalentCard talent={t} />
            </div>
          ))}
          {!loading && !result?.error && talents.length === 0 && (
            <div className="col-lg-12 text-center py-4">
              <p className="text mb-0">No freelancers here yet.</p>
            </div>
          )}
          {!loading && result?.error && <p className="col-lg-12 text-center text-danger">Could not load freelancers.</p>}
          <div className="col-lg-12">
            <div className="text-center mt30">
              <Link className="ud-btn bdrs60 btn-light-thm" href={tab ? `/freelancers?role=${tab}` : "/freelancers"}>
                All Freelancers
                <i className="fal fa-arrow-right-long" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
