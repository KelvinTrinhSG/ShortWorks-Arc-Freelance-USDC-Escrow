"use client";
import {
  LANGUAGES,
  NICHES,
  PLATFORMS,
  ROLES,
  TURNAROUND,
} from "@/data/talentOptions";
import { useEffect, useState } from "react";
import TalentCard from "./TalentCard";

const LIST_FILTERS = [
  { key: "role", label: "Role", options: ROLES },
  { key: "platform", label: "Platform", options: PLATFORMS },
  { key: "niche", label: "Niche", options: NICHES },
  { key: "language", label: "Language", options: LANGUAGES },
];

const PRICES = [
  { value: "25", label: "Up to $25" },
  { value: "50", label: "Up to $50" },
  { value: "100", label: "Up to $100" },
  { value: "200", label: "Up to $200" },
];

const DELIVERIES = TURNAROUND.map((t) => ({
  value: String(t.value),
  label: `Within ${t.label}`,
}));

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "fastest", label: "Fastest delivery" },
  { value: "newest", label: "Newest" },
];

const EMPTY = {
  q: "",
  role: [],
  platform: [],
  niche: [],
  language: [],
  maxPrice: "",
  maxDelivery: "",
  available: false,
  sort: "recommended",
  page: 1,
};

// Filters <-> query string, so a filtered list can be shared or bookmarked.
function parseQuery(query) {
  const params = new URLSearchParams(query);
  const list = (key) => (params.get(key) || "").split(",").filter(Boolean);
  return {
    q: params.get("q") || "",
    role: list("role"),
    platform: list("platform"),
    niche: list("niche"),
    language: list("language"),
    maxPrice: params.get("maxPrice") || "",
    maxDelivery: params.get("maxDelivery") || "",
    available: params.get("available") === "1",
    sort: params.get("sort") || "recommended",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

function toQuery(f) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  for (const { key } of LIST_FILTERS) {
    if (f[key].length) params.set(key, f[key].join(","));
  }
  if (f.maxPrice) params.set("maxPrice", f.maxPrice);
  if (f.maxDelivery) params.set("maxDelivery", f.maxDelivery);
  if (f.available) params.set("available", "1");
  if (f.sort !== "recommended") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  return params.toString();
}

function Dropdown({ label, count, children }) {
  return (
    <li className="list-inline-item position-relative mb10">
      <button
        className={`open-btn dropdown-toggle ${count ? "fw600" : ""}`}
        type="button"
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
      >
        {label}
        {count ? ` (${count})` : ""}
        <i className="fa fa-angle-down ms-2" />
      </button>
      <div className="dropdown-menu dd4 pb10">
        <div className="widget-wrapper pr20">
          <div className="checkbox-style1">{children}</div>
        </div>
      </div>
    </li>
  );
}

function Check({ label, checked, onChange, type = "checkbox" }) {
  return (
    <label className="custom_checkbox">
      {label}
      <input type={type} checked={checked} onChange={onChange} />
      <span className="checkmark" />
    </label>
  );
}

// Page numbers with "…" gaps, e.g. 1 … 4 5 6 … 20
function pageItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) items.push("gap-" + p);
    items.push(p);
  });
  return items;
}

export default function TalentDirectory({ initialQuery = "" }) {
  const [filters, setFilters] = useState(() => parseQuery(initialQuery));
  const [search, setSearch] = useState(filters.q);
  const [result, setResult] = useState(null); // { query, talents, total, ... } | { query, error }
  const query = toQuery(filters);
  const loading = result?.query !== query;

  useEffect(() => {
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    const controller = new AbortController();
    fetch(`/api/talents?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setResult({ query, ...data }))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setResult({ query, error: "Could not load talents. Please try again." });
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
    LIST_FILTERS.reduce((n, { key }) => n + filters[key].length, 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.maxDelivery ? 1 : 0) +
    (filters.available ? 1 : 0) +
    (filters.q ? 1 : 0);

  const totalPages = result?.total ? Math.ceil(result.total / result.pageSize) : 0;
  const shown = !loading && result?.talents ? result : null;

  return (
    <>
      {/* Banner + search */}
      <section className="breadcumb-section pt-0">
        <div className="cta-service-v1 cta-banner mx-auto maxw1700 pt80 pb80 bdrs16 position-relative overflow-hidden d-flex align-items-center mx20-lg px30-lg">
          <div className="container">
            <div className="row">
              <div className="col-xl-7">
                <h2>Find short-form video talent</h2>
                <p className="text mb30">
                  Editors, UGC creators and motion designers for TikTok, Reels
                  and Shorts. Compare portfolios, prices and delivery times.
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
                      <div className="text-center text-xl-start">
                        <button className="ud-btn btn-thm w-100" type="submit">
                          Search
                        </button>
                      </div>
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
          {/* Filters */}
          <div className="row align-items-center mb20">
            <div className="col-lg-9">
              <ul className="p-0 mb-0 dropdown-lists">
                {LIST_FILTERS.map(({ key, label, options }) => (
                  <Dropdown key={key} label={label} count={filters[key].length}>
                    {options.map((o) => (
                      <Check
                        key={o.value}
                        label={o.label}
                        checked={filters[key].includes(o.value)}
                        onChange={() => toggle(key, o.value)}
                      />
                    ))}
                  </Dropdown>
                ))}
                <Dropdown label="Price" count={filters.maxPrice ? 1 : 0}>
                  <Check
                    type="radio"
                    label="Any price"
                    checked={!filters.maxPrice}
                    onChange={() => change({ maxPrice: "" })}
                  />
                  {PRICES.map((o) => (
                    <Check
                      key={o.value}
                      type="radio"
                      label={o.label}
                      checked={filters.maxPrice === o.value}
                      onChange={() => change({ maxPrice: o.value })}
                    />
                  ))}
                </Dropdown>
                <Dropdown label="Delivery" count={filters.maxDelivery ? 1 : 0}>
                  <Check
                    type="radio"
                    label="Any time"
                    checked={!filters.maxDelivery}
                    onChange={() => change({ maxDelivery: "" })}
                  />
                  {DELIVERIES.map((o) => (
                    <Check
                      key={o.value}
                      type="radio"
                      label={o.label}
                      checked={filters.maxDelivery === o.value}
                      onChange={() => change({ maxDelivery: o.value })}
                    />
                  ))}
                </Dropdown>
                <li className="list-inline-item mb10">
                  <button
                    type="button"
                    className={`open-btn ${filters.available ? "fw600" : ""}`}
                    onClick={() => change({ available: !filters.available })}
                    aria-pressed={filters.available}
                  >
                    <span
                      className="d-inline-block rounded-circle me-2"
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: filters.available ? "#22c55e" : "#9ca3af",
                      }}
                    />
                    Available now
                  </button>
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
                <label htmlFor="talent-sort" className="dark-color fz14 mb-0 text-nowrap">
                  Sort by
                </label>
                <select
                  id="talent-sort"
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
              ? "Loading talents..."
              : result?.error
                ? ""
                : `${result.total} ${result.total === 1 ? "talent" : "talents"} found`}
          </p>

          {result?.error && !loading && <p className="text-danger">{result.error}</p>}

          {/* Results */}
          <div className="row" style={{ opacity: loading && result ? 0.5 : 1 }}>
            {/* While a new query loads, keep the previous results visible but faded. */}
            {(result?.talents ?? []).map((t) => (
              <div key={t.username} className="col-md-6 col-lg-4 col-xl-3 mb30">
                <TalentCard talent={t} />
              </div>
            ))}
          </div>

          {shown && shown.total === 0 && (
            <div className="text-center py-5">
              <h4 className="mb10">No talents found</h4>
              <p className="text mb20">
                {activeCount
                  ? "Try removing some filters."
                  : "No one has joined yet."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {shown && totalPages > 1 && (
            <div className="mbp_pagination text-center mt30">
              <ul className="page_navigation">
                <li className={`page-item ${filters.page === 1 ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => goToPage(filters.page - 1)}
                    disabled={filters.page === 1}
                    aria-label="Previous page"
                  >
                    <span className="fas fa-angle-left" />
                  </button>
                </li>
                {pageItems(filters.page, totalPages).map((p) =>
                  typeof p === "string" ? (
                    <li key={p} className="page-item">
                      <span className="page-link">...</span>
                    </li>
                  ) : (
                    <li
                      key={p}
                      className={`page-item ${p === filters.page ? "active" : ""}`}
                      aria-current={p === filters.page ? "page" : undefined}
                    >
                      <button type="button" className="page-link" onClick={() => goToPage(p)}>
                        {p}
                      </button>
                    </li>
                  ),
                )}
                <li className={`page-item ${filters.page === totalPages ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => goToPage(filters.page + 1)}
                    disabled={filters.page === totalPages}
                    aria-label="Next page"
                  >
                    <span className="fas fa-angle-right" />
                  </button>
                </li>
              </ul>
              <p className="mt10 mb-0 text-center">
                {(filters.page - 1) * shown.pageSize + 1} –{" "}
                {Math.min(filters.page * shown.pageSize, shown.total)} of {shown.total} talents
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
