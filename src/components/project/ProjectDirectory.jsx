"use client";
import { MY_STATUSES, VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { PLATFORMS } from "@/data/talentOptions";
import { useCurrentUser } from "@/store/authStore";
import BannerDecor from "../breadcumb/BannerDecor";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FilterCheck, FilterDropdown } from "../listing/FilterDropdown";
import Pagination from "../listing/Pagination";
import ProjectCard from "./ProjectCard";

// `freelancerOnly`: the API only applies it for a logged-in freelancer (their proposal / invitation).
const LIST_FILTERS = [
  { key: "platform", label: "Platform", options: PLATFORMS },
  { key: "workType", label: "Type of work", options: WORK_TYPES },
  { key: "length", label: "Video length", options: VIDEO_LENGTHS },
  { key: "status", label: "Status", options: MY_STATUSES, freelancerOnly: true },
];

const BUDGETS = [
  { value: "25", label: "$25+ per video" },
  { value: "50", label: "$50+ per video" },
  { value: "100", label: "$100+ per video" },
  { value: "200", label: "$200+ per video" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "budget-desc", label: "Highest budget per video" },
  { value: "total-desc", label: "Highest total budget" },
  { value: "deadline-asc", label: "Deadline soonest" },
];

const EMPTY = { q: "", platform: [], workType: [], length: [], status: [], minBudget: "", sort: "newest", page: 1 };

// Filters <-> query string, so a filtered list can be shared or bookmarked.
function parseQuery(query) {
  const params = new URLSearchParams(query);
  const list = (key) => (params.get(key) || "").split(",").filter(Boolean);
  return {
    q: params.get("q") || "",
    platform: list("platform"),
    workType: list("workType"),
    length: list("length"),
    status: list("status"),
    minBudget: params.get("minBudget") || "",
    sort: params.get("sort") || "newest",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

function toQuery(f) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  for (const { key } of LIST_FILTERS) if (f[key].length) params.set(key, f[key].join(","));
  if (f.minBudget) params.set("minBudget", f.minBudget);
  if (f.sort !== "newest") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  return params.toString();
}

export default function ProjectDirectory({ initialQuery = "" }) {
  const [filters, setFilters] = useState(() => parseQuery(initialQuery));
  const [search, setSearch] = useState(filters.q);
  const [result, setResult] = useState(null); // { query, projects, total, ... } | { query, error }
  const accountType = useCurrentUser()?.accountType;
  const isClient = accountType === "client";
  const filtersShown = LIST_FILTERS.filter((f) => !f.freelancerOnly || accountType === "freelancer");
  const query = toQuery(filters);
  const loading = result?.query !== query;

  useEffect(() => {
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    const controller = new AbortController();
    fetch(`/api/projects?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setResult({ query, now: Date.now(), ...data }))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setResult({ query, error: "Could not load projects. Please try again." });
        }
      });
    return () => controller.abort();
  }, [query]);

  // Any filter change goes back to page 1.
  const change = (patch) => setFilters((prev) => ({ ...prev, page: 1, ...patch }));
  const toggle = (key, value) =>
    change({
      [key]: filters[key].includes(value)
        ? filters[key].filter((v) => v !== value)
        : [...filters[key], value],
    });
  const goToPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCount =
    filtersShown.reduce((n, { key }) => n + filters[key].length, 0) +
    (filters.minBudget ? 1 : 0) +
    (filters.q ? 1 : 0);
  const shown = !loading && result?.projects ? result : null;

  return (
    <>
      {/* Banner + search */}
      <section className="breadcumb-section pt-0">
        {/* The template fixes the banner at 300px; let it grow for the extra Create Project row. */}
        <div
          style={isClient ? { height: "auto" } : undefined}
          className={`cta-service-v1 cta-banner mx-auto maxw1700 ${isClient ? "pt20 pb20" : "pt80 pb80"} bdrs16 position-relative overflow-hidden d-flex align-items-center mx20-lg px30-lg`}>
          <BannerDecor />
          <div className="container">
            <div className="row wow fadeInUp">
              <div className="col-xl-7">
                <h2>Find short-form video projects</h2>
                <p className="text mb15">
                  Brands and creators looking for editors, UGC creators and
                  motion designers. See the scope, budget and deadline up
                  front, then send your proposal.
                </p>
                <form
                  className="advance-search-tab bgc-white p10 bdrs4 zi1 position-relative"
                  onSubmit={(e) => {
                    e.preventDefault();
                    change({ q: search.trim() });
                  }}
                >
                  <div className="row">
                    <div className="col-md-8 col-xl-9">
                      <div className="advance-search-field">
                        <div className="box-search bb1-sm">
                          <span className="icon far fa-magnifying-glass" />
                          <input
                            className="form-control"
                            type="search"
                            placeholder="Search by title or brief"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            maxLength={100}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4 col-xl-3">
                      <button className="ud-btn btn-thm w-100" type="submit">
                        Search
                      </button>
                    </div>
                  </div>
                </form>
                {isClient && (
                  <div className="d-flex flex-wrap align-items-center gap-3 mt15">
                    <Link href="/create-projects" className="ud-btn btn-thm">
                      Create Project
                      <i className="fal fa-arrow-right-long" />
                    </Link>
                    <p className="text mb-0">
                      <span className="dark-color fw500">Need a video made?</span>{" "}
                      Post your project and get proposals from editors and
                      creators.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pt30 pb90">
        <div className="container">
          {/* Filters */}
          <div className="row align-items-center mb20">
            <div className="col-lg-9">
              <ul className="p-0 mb-0 dropdown-lists">
                {filtersShown.map(({ key, label, options }) => (
                  <FilterDropdown key={key} label={label} count={filters[key].length}>
                    {options.map((o) => (
                      <FilterCheck
                        key={o.value}
                        label={o.label}
                        checked={filters[key].includes(o.value)}
                        onChange={() => toggle(key, o.value)}
                      />
                    ))}
                  </FilterDropdown>
                ))}
                <FilterDropdown label="Budget" count={filters.minBudget ? 1 : 0}>
                  <FilterCheck
                    type="radio"
                    label="Any budget"
                    checked={!filters.minBudget}
                    onChange={() => change({ minBudget: "" })}
                  />
                  {BUDGETS.map((o) => (
                    <FilterCheck
                      key={o.value}
                      type="radio"
                      label={o.label}
                      checked={filters.minBudget === o.value}
                      onChange={() => change({ minBudget: o.value })}
                    />
                  ))}
                </FilterDropdown>
                {activeCount > 0 && (
                  <li className="list-inline-item mb10">
                    <button
                      type="button"
                      className="open-btn text-thm"
                      onClick={() => {
                        setSearch("");
                        setFilters({ ...EMPTY, sort: filters.sort });
                      }}
                    >
                      Clear all
                    </button>
                  </li>
                )}
              </ul>
            </div>
            <div className="col-lg-3">
              <div className="d-flex align-items-center justify-content-lg-end gap-2 mb10">
                <label htmlFor="project-sort" className="dark-color fz14 mb-0 text-nowrap">
                  Sort by
                </label>
                <select
                  id="project-sort"
                  className="form-select form-select-sm w-auto"
                  value={filters.sort}
                  onChange={(e) => change({ sort: e.target.value })}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <p className="text fz14 mb20" aria-live="polite">
            {loading
              ? "Loading projects..."
              : result?.error
                ? ""
                : `${result.total} open ${result.total === 1 ? "project" : "projects"}`}
          </p>

          {result?.error && !loading && <p className="text-danger">{result.error}</p>}

          {/* While a new query loads, keep the previous results visible but faded. */}
          <div className="row" style={{ opacity: loading && result ? 0.5 : 1 }}>
            {(result?.projects ?? []).map((p) => (
              <div key={p.id} className="col-lg-6 mb30">
                <ProjectCard
                  project={p}
                  now={result.now}
                  ctaLabel={isClient ? "View Details" : undefined}
                />
              </div>
            ))}
          </div>

          {shown && shown.total === 0 && (
            <div className="text-center py-5">
              <h4 className="mb10">No open projects found</h4>
              <p className="text mb0">
                {activeCount ? "Try removing some filters." : "Check back soon for new projects."}
              </p>
            </div>
          )}

          {shown && (
            <Pagination
              page={filters.page}
              pageSize={shown.pageSize}
              total={shown.total}
              noun="projects"
              onChange={goToPage}
            />
          )}
        </div>
      </section>
    </>
  );
}
