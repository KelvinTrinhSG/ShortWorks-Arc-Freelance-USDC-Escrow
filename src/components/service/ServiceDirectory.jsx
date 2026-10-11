"use client";
import { VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { DELIVERY_FILTERS, MAX_PRICE_FILTERS } from "@/data/serviceOptions";
import { PLATFORMS } from "@/data/talentOptions";
import { useCurrentUser } from "@/store/authStore";
import BannerDecor from "../breadcumb/BannerDecor";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FilterCheck, FilterDropdown } from "../listing/FilterDropdown";
import Pagination from "../listing/Pagination";
import ServiceCard from "./ServiceCard";

const LIST_FILTERS = [
  { key: "workType", label: "Type of work", options: WORK_TYPES },
  { key: "platform", label: "Platform", options: PLATFORMS },
  { key: "length", label: "Video length", options: VIDEO_LENGTHS },
];

// Single-choice filters: { key, label, any, options }
const RADIO_FILTERS = [
  { key: "maxPrice", label: "Price", any: "Any price", options: MAX_PRICE_FILTERS },
  { key: "maxDays", label: "Delivery", any: "Any time", options: DELIVERY_FILTERS },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Lowest price" },
  { value: "price-desc", label: "Highest price" },
  { value: "fastest", label: "Fastest delivery" },
];

const EMPTY = { q: "", workType: [], platform: [], length: [], maxPrice: "", maxDays: "", sort: "newest", page: 1 };

// Filters <-> query string, so a filtered list can be shared or bookmarked.
function parseQuery(query) {
  const params = new URLSearchParams(query);
  const list = (key) => (params.get(key) || "").split(",").filter(Boolean);
  return {
    q: params.get("q") || "",
    workType: list("workType"),
    platform: list("platform"),
    length: list("length"),
    maxPrice: params.get("maxPrice") || "",
    maxDays: params.get("maxDays") || "",
    sort: params.get("sort") || "newest",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

function toQuery(f) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  for (const { key } of LIST_FILTERS) if (f[key].length) params.set(key, f[key].join(","));
  for (const { key } of RADIO_FILTERS) if (f[key]) params.set(key, f[key]);
  if (f.sort !== "newest") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  return params.toString();
}

// /service-4: services freelancers offer, with search, filters, sort and pages.
export default function ServiceDirectory({ initialQuery = "" }) {
  const [filters, setFilters] = useState(() => parseQuery(initialQuery));
  const [search, setSearch] = useState(filters.q);
  const [result, setResult] = useState(null); // { query, services, total, ... } | { query, error }
  const isFreelancer = useCurrentUser()?.accountType === "freelancer";
  const query = toQuery(filters);
  const loading = result?.query !== query;

  useEffect(() => {
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    const controller = new AbortController();
    fetch(`/api/services?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setResult({ query, ...data }))
      .catch((err) => {
        if (err.name !== "AbortError") setResult({ query, error: "Could not load services. Please try again." });
      });
    return () => controller.abort();
  }, [query]);

  // Any filter change goes back to page 1.
  const change = (patch) => setFilters((prev) => ({ ...prev, page: 1, ...patch }));
  const toggle = (key, value) =>
    change({ [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value] });
  const goToPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCount =
    LIST_FILTERS.reduce((n, { key }) => n + filters[key].length, 0) +
    RADIO_FILTERS.filter(({ key }) => filters[key]).length +
    (filters.q ? 1 : 0);
  const shown = !loading && result?.services ? result : null;

  return (
    <>
      {/* Banner + search */}
      <section className="breadcumb-section pt-0">
        <div className="cta-service-v1 cta-banner mx-auto maxw1700 pt120 pb120 bdrs16 position-relative overflow-hidden d-flex align-items-center mx20-lg px30-lg">
          <BannerDecor />
          <div className="container">
            <div className="row wow fadeInUp">
              <div className="col-xl-7">
                <div className="position-relative">
                  <h2>Short-form video services</h2>
                  <p className="text mb30">
                    Ready-made offers from editors, UGC creators and motion designers. Pick one, order
                    and pay with PayPal: you&apos;re only charged when you approve the videos.
                  </p>
                </div>
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
                            placeholder="Search services or freelancers"
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
                {isFreelancer && (
                  <p className="text mt15 mb-0">
                    <span className="dark-color fw500">Offer your own?</span>{" "}
                    <Link href="/add-services" className="text-thm">
                      Add a service →
                    </Link>
                  </p>
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
                {LIST_FILTERS.map(({ key, label, options }) => (
                  <FilterDropdown key={key} label={label} count={filters[key].length}>
                    {options.map((o) => (
                      <FilterCheck key={o.value} label={o.label} checked={filters[key].includes(o.value)} onChange={() => toggle(key, o.value)} />
                    ))}
                  </FilterDropdown>
                ))}
                {RADIO_FILTERS.map(({ key, label, any, options }) => (
                  <FilterDropdown key={key} label={label} count={filters[key] ? 1 : 0}>
                    <FilterCheck type="radio" label={any} checked={!filters[key]} onChange={() => change({ [key]: "" })} />
                    {options.map((o) => (
                      <FilterCheck key={o.value} type="radio" label={o.label} checked={filters[key] === o.value} onChange={() => change({ [key]: o.value })} />
                    ))}
                  </FilterDropdown>
                ))}
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
                <label htmlFor="service-sort" className="dark-color fz14 mb-0 text-nowrap">
                  Sort by
                </label>
                <select id="service-sort" className="form-select form-select-sm w-auto" value={filters.sort} onChange={(e) => change({ sort: e.target.value })}>
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
            {loading ? "Loading services..." : result?.error ? "" : `${result.total} ${result.total === 1 ? "service" : "services"}`}
          </p>
          {result?.error && !loading && <p className="text-danger">{result.error}</p>}

          {/* While a new query loads, keep the previous results visible but faded. */}
          <div className="row" style={{ opacity: loading && result ? 0.5 : 1 }}>
            {(result?.services ?? []).map((s) => (
              <div key={s.id} className="col-sm-6 col-lg-4 col-xl-3 mb30">
                <ServiceCard service={s} />
              </div>
            ))}
          </div>

          {shown && shown.total === 0 && (
            <div className="text-center py-5">
              <h4 className="mb10">No services found</h4>
              <p className="text mb0">{activeCount ? "Try removing some filters." : "Freelancers haven't published services yet."}</p>
            </div>
          )}

          {shown && <Pagination page={filters.page} pageSize={shown.pageSize} total={shown.total} noun="services" onChange={goToPage} />}
        </div>
      </section>
    </>
  );
}
