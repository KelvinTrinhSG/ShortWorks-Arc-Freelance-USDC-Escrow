"use client";
import { JOB_STATUSES, VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { PLATFORMS } from "@/data/talentOptions";
import BannerDecor from "../breadcumb/BannerDecor";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FilterCheck, FilterDropdown } from "../listing/FilterDropdown";
import Pagination from "../listing/Pagination";
import JobCard from "./JobCard";

const LIST_FILTERS = [
  { key: "status", label: "Status", options: JOB_STATUSES },
  { key: "platform", label: "Platform", options: PLATFORMS },
  { key: "workType", label: "Type of work", options: WORK_TYPES },
  { key: "length", label: "Video length", options: VIDEO_LENGTHS },
];

const PRICES = [
  { value: "25", label: "$25+ per video" },
  { value: "50", label: "$50+ per video" },
  { value: "100", label: "$100+ per video" },
  { value: "200", label: "$200+ per video" },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "newest", label: "Recently hired" },
  { value: "total-desc", label: "Highest total" },
];

const EMPTY = { q: "", platform: [], workType: [], length: [], status: [], minPrice: "", sort: "priority", page: 1 };

const INTRO = {
  freelancer: {
    title: "Your Jobs",
    text: "Projects where the client accepted your proposal. Keep track of what to deliver and when.",
  },
  client: {
    title: "Your Jobs",
    text: "Projects where you hired a freelancer. They leave the Projects list once you accept a proposal.",
  },
  guest: {
    title: "Jobs",
    text: "Once a client accepts a proposal, the project becomes a job and is managed here.",
  },
};

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
    minPrice: params.get("minPrice") || "",
    sort: params.get("sort") || "priority",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

function toQuery(f) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  for (const { key } of LIST_FILTERS) if (f[key].length) params.set(key, f[key].join(","));
  if (f.minPrice) params.set("minPrice", f.minPrice);
  if (f.sort !== "priority") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  return params.toString();
}

// /job-1: the logged-in user's jobs (accepted proposals). `accountType` comes from
// the server page; guests get a log-in prompt instead of the list.
export default function JobDirectory({ initialQuery = "", accountType = null, today }) {
  const [filters, setFilters] = useState(() => parseQuery(initialQuery));
  const [search, setSearch] = useState(filters.q);
  const [result, setResult] = useState(null); // { query, jobs, total, ... } | { query, error }
  const isClient = accountType === "client";
  const intro = INTRO[accountType] ?? INTRO.guest;
  const query = toQuery(filters);
  const loading = accountType && result?.query !== query;

  useEffect(() => {
    if (!accountType) return;
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    const controller = new AbortController();
    fetch(`/api/jobs?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setResult({ query, ...data }))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setResult({ query, error: "Could not load jobs. Please try again." });
        }
      });
    return () => controller.abort();
  }, [query, accountType]);

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
    LIST_FILTERS.reduce((n, { key }) => n + filters[key].length, 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.q ? 1 : 0);
  const shown = !loading && result?.jobs ? result : null;

  return (
    <>
      {/* Banner + search, same look as the Services banner (Breadcumb9). */}
      <section className="breadcumb-section pt-0">
        <div className="cta-service-v1 cta-banner mx-auto maxw1700 pt120 pb120 bdrs16 position-relative overflow-hidden d-flex align-items-center mx20-lg px30-lg">
          <BannerDecor />
          <div className="container">
            <div className="row wow fadeInUp">
              <div className="col-xl-7">
                <div className="position-relative">
                  <h2>{intro.title}</h2>
                  <p className="text mb30">{intro.text}</p>
                </div>
                {accountType && (
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
                              placeholder="Search by project title or brief"
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
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pt30 pb90">
        <div className="container">
          {!accountType ? (
            <div className="text-center py-5">
              <h4 className="mb10">Log in to see your jobs</h4>
              <p className="text mb20">
                Freelancers see the jobs they were hired for. Clients see the
                freelancers they hired.
              </p>
              <Link href="/login?next=%2Fjob-1" className="ud-btn btn-thm">
                Log in <i className="fal fa-arrow-right-long" />
              </Link>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="row align-items-center mb20">
                <div className="col-lg-9">
                  <ul className="p-0 mb-0 dropdown-lists">
                    {LIST_FILTERS.map(({ key, label, options }) => (
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
                    <FilterDropdown label="Price" count={filters.minPrice ? 1 : 0}>
                      <FilterCheck
                        type="radio"
                        label="Any price"
                        checked={!filters.minPrice}
                        onChange={() => change({ minPrice: "" })}
                      />
                      {PRICES.map((o) => (
                        <FilterCheck
                          key={o.value}
                          type="radio"
                          label={o.label}
                          checked={filters.minPrice === o.value}
                          onChange={() => change({ minPrice: o.value })}
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
                    <label htmlFor="job-sort" className="dark-color fz14 mb-0 text-nowrap">
                      Sort by
                    </label>
                    <select
                      id="job-sort"
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
                  ? "Loading jobs..."
                  : result?.error
                    ? ""
                    : `${result.total} ${result.total === 1 ? "job" : "jobs"}`}
              </p>

              {result?.error && !loading && <p className="text-danger">{result.error}</p>}

              {/* While a new query loads, keep the previous results visible but faded. */}
              <div className="row" style={{ opacity: loading && result ? 0.5 : 1 }}>
                {(result?.jobs ?? []).map((j) => (
                  <div key={j.id} className="col-lg-6 mb30">
                    <JobCard job={j} isClient={isClient} today={today} />
                  </div>
                ))}
              </div>

              {shown && shown.total === 0 && (
                <div className="text-center py-5">
                  <h4 className="mb10">No jobs found</h4>
                  <p className="text mb20">
                    {activeCount
                      ? "Try removing some filters."
                      : isClient
                        ? "Accept a proposal on one of your projects and it shows up here."
                        : "When a client accepts your proposal, the job shows up here."}
                  </p>
                  {!activeCount && (
                    <Link href={isClient ? "/manage-projects" : "/project-1"} className="ud-btn btn-thm">
                      {isClient ? "Manage Projects" : "Browse projects"}{" "}
                      <i className="fal fa-arrow-right-long" />
                    </Link>
                  )}
                </div>
              )}

              {shown && (
                <Pagination
                  page={filters.page}
                  pageSize={shown.pageSize}
                  total={shown.total}
                  noun="jobs"
                  onChange={goToPage}
                />
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
