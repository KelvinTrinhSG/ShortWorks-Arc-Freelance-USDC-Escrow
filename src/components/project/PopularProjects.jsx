"use client";
import { WORK_TYPES } from "@/data/projectOptions";
import { useCurrentUser } from "@/store/authStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";

const TABS = [{ value: "", label: "All" }, ...WORK_TYPES];
const SHOWN = 6;

// Home page "Popular Projects": open projects with the most proposals, by type of work.
export default function PopularProjects() {
  const [tab, setTab] = useState("");
  const [result, setResult] = useState(null); // { tab, projects, now } | { tab, error }
  const isClient = useCurrentUser()?.accountType === "client";
  const loading = result?.tab !== tab;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ sort: "popular" });
    if (tab) params.set("workType", tab);
    fetch(`/api/projects?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data) => setResult({ tab, projects: data.projects.slice(0, SHOWN), now: Date.now() }))
      .catch((err) => err.name !== "AbortError" && setResult({ tab, error: true }));
    return () => controller.abort();
  }, [tab]);

  const projects = result?.projects ?? [];
  const allHref = tab ? `/projects?workType=${tab}` : "/projects";

  return (
    <section className="pt-0 pb100">
      <div className="container">
        <div className="row align-items-center wow fadeInUp">
          <div className="col-xl-4">
            <div className="main-title mb30-lg">
              <h2 className="title">Popular Projects</h2>
              <p className="paragraph">Open short-form video projects freelancers are applying to right now</p>
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
          {projects.map((p) => (
            <div key={p.id} className="col-md-6 col-xl-4 mb30">
              <ProjectCard project={p} now={result.now} ctaLabel={isClient ? "View Details" : undefined} />
            </div>
          ))}
          {!loading && !result?.error && projects.length === 0 && (
            <div className="col-lg-12 text-center py-4">
              <p className="text mb-0">No open projects here right now.</p>
            </div>
          )}
          {!loading && result?.error && <p className="col-lg-12 text-center text-danger">Could not load projects.</p>}
          <div className="col-lg-12">
            <div className="text-center mt30">
              <Link className="ud-btn bdrs60 btn-light-thm" href={allHref}>
                All Projects
                <i className="fal fa-arrow-right-long" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
