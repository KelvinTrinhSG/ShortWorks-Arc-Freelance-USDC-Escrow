"use client";
import { COUNTRIES } from "@/data/talentOptions";
import { useEffect, useState } from "react";
import BannerDecor from "../breadcumb/BannerDecor";
import { FilterCheck, FilterDropdown } from "../listing/FilterDropdown";
import Pagination from "../listing/Pagination";
import EmployerCard from "./EmployerCard";

const SORT_OPTIONS = [
  { value: "open-desc", label: "Most open projects" },
  { value: "hires-desc", label: "Most hires" },
  { value: "newest", label: "Newest" },
];

const EMPTY = { q: "", country: [], hiring: false, sort: "open-desc", page: 1 };

// Filters <-> query string, so a filtered list can be shared or bookmarked.
function parseQuery(query) {
  const params = new URLSearchParams(query);
  return {
    q: params.get("q") || "",
    country: (params.get("country") || "").split(",").filter(Boolean),
    hiring: params.get("hiring") === "1",
    sort: params.get("sort") || "open-desc",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

function toQuery(f) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.country.length) params.set("country", f.country.join(","));
  if (f.hiring) params.set("hiring", "1");
  if (f.sort !== "open-desc") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  return params.toString();
}

// /employers: brands and creators who post projects, those hiring now first.
export default function EmployerDirectory({ initialQuery = "" }) {
  const [filters, setFilters] = useState(() => parseQuery(initialQuery));
  const [search, setSearch] = useState(filters.q);
  const [result, setResult] = useState(null); // { query, employers, total, ... } | { query, error }
  const query = toQuery(filters);
  const loading = result?.query !== query;

  useEffect(() => {
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    const controller = new AbortController();
    fetch(`/api/employers?${query}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data) => setResult({ query, ...data }))
      .catch((err) => err.name !== "AbortError" && setResult({ query, error: "Could not load employers. Please try again." }));
    return () => controller.abort();
  }, [query]);

  const change = (patch) => setFilters((prev) => ({ ...prev, page: 1, ...patch }));
  const toggleCountry = (c) =>
    change({ country: filters.country.includes(c) ? filters.country.filter((x) => x !== c) : [...filters.country, c] });
  const goToPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCount = filters.country.length + (filters.hiring ? 1 : 0) + (filters.q ? 1 : 0);
  const shown = !loading && result?.employers ? result : null;

  return (
    <>
      {/* Banner + search */}
      <section className="breadcumb-section pt-0">
        <div className="cta-service-v1 cta-banner mx-auto maxw1700 pt120 pb120 bdrs16 position-relative overflow-hidden d-flex align-items-center mx20-lg px30-lg">
          <BannerDecor art="employers" />
          <div className="container position-relative zi1">
            <div className="row wow fadeInUp">
              <div className="col-xl-7">
                <h2>Find employers</h2>
                <p className="text mb30">
                  Brands and creators hiring short-form video talent. See who&apos;s hiring now and send a
                  proposal on their open projects.
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
                            placeholder="Search by name or headline"
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
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pt30 pb90">
        <div className="container">
          <div className="row align-items-center mb20">
            <div className="col-lg-9">
              <ul className="p-0 mb-0 dropdown-lists">
                <FilterDropdown label="Location" count={filters.country.length}>
                  {COUNTRIES.map((c) => (
                    <FilterCheck key={c.value} label={c.label} checked={filters.country.includes(c.value)} onChange={() => toggleCountry(c.value)} />
                  ))}
                </FilterDropdown>
                <li className="list-inline-item mb10">
                  <label className="open-btn d-inline-flex align-items-center gap-2 mb-0" style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={filters.hiring} onChange={(e) => change({ hiring: e.target.checked })} />
                    Hiring now
                  </label>
                </li>
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
                <label htmlFor="employer-sort" className="dark-color fz14 mb-0 text-nowrap">
                  Sort by
                </label>
                <select id="employer-sort" className="form-select form-select-sm w-auto" value={filters.sort} onChange={(e) => change({ sort: e.target.value })}>
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
            {loading ? "Loading employers..." : result?.error ? "" : `${result.total} ${result.total === 1 ? "employer" : "employers"}`}
          </p>
          {result?.error && !loading && <p className="text-danger">{result.error}</p>}

          <div className="row" style={{ opacity: loading && result ? 0.5 : 1 }}>
            {(result?.employers ?? []).map((e) => (
              <div key={e.username} className="col-sm-6 col-lg-4 col-xl-3 mb30">
                <EmployerCard employer={e} />
              </div>
            ))}
          </div>

          {shown && shown.total === 0 && (
            <div className="text-center py-5">
              <h4 className="mb10">No employers found</h4>
              <p className="text mb0">{activeCount ? "Try removing some filters." : "No client accounts yet."}</p>
            </div>
          )}

          {shown && <Pagination page={filters.page} pageSize={shown.pageSize} total={shown.total} noun="employers" onChange={goToPage} />}
        </div>
      </section>
    </>
  );
}
