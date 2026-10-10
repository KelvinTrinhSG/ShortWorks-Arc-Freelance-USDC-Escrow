"use client";
import Link from "next/link";
import { useState } from "react";
import { VIDEO_LENGTHS } from "@/data/projectOptions";
import { labelOf } from "@/data/talentOptions";
import DashboardNavigation from "../header/DashboardNavigation";
import ProjectOwnerActions from "../../project/ProjectOwnerActions";
import { formatDate } from "../../project/ProjectCard";

// Every project lands in exactly one tab.
const isHired = (p) => p.hired && p.status === "open";
const TABS = [
  { key: "open", label: "Open", test: (p) => p.isOpen, empty: "You have no open projects." },
  { key: "hired", label: "Hired", test: isHired, empty: "No hired projects yet. Accept a proposal to hire a freelancer." },
  { key: "closed", label: "Closed", test: (p) => !p.isOpen && !isHired(p), empty: "No closed projects." },
];

// Where a project stands: open, hired, closed by the client, or past its deadline.
const statusLabel = (p) =>
  p.isOpen ? "Open" : isHired(p) ? "Hired" : p.status === "closed" ? "Closed" : "Deadline passed";

// Client's projects. `projects` comes from the server page (getOwnedProjects);
// actions refresh the page so the list stays in sync with the database.
export default function ManageProjectInfo({ projects, accountType }) {
  const [tab, setTab] = useState("open");
  const visible = projects.filter(TABS.find((t) => t.key === tab).test);

  return (
    <div className="dashboard__content hover-bgc-color">
      <div className="row pb40">
        <div className="col-lg-12">
          <DashboardNavigation />
        </div>
        <div className="col-lg-9">
          <div className="dashboard_title_area">
            <h2>Manage Projects</h2>
            <p className="text">
              Review proposals, edit, close or delete the projects you posted.
            </p>
          </div>
        </div>
        {accountType === "client" && (
          <div className="col-lg-3">
            <div className="text-lg-end">
              <Link href="/create-projects" className="ud-btn btn-dark default-box-shadow2">
                Create Project
                <i className="fal fa-arrow-right-long" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {accountType !== "client" ? (
        <div className="ps-widget bgc-white bdrs4 p30 mb30">
          <h5 className="mb10">Projects are posted by clients</h5>
          <p className="text mb20">
            Your account is a freelancer account. Find work on the projects
            page, and edit or withdraw a proposal from the project&apos;s page.
          </p>
          <Link href="/project-1" className="ud-btn btn-thm">
            Browse projects <i className="fal fa-arrow-right-long" />
          </Link>
        </div>
      ) : (
        <div className="ps-widget bgc-white bdrs4 p30 mb30 overflow-hidden position-relative">
          <div className="navtab-style1">
            <nav>
              <div className="nav nav-tabs mb30">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`nav-link fw500 ps-0 ${tab === t.key ? "active" : ""}`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label} ({projects.filter(t.test).length})
                  </button>
                ))}
              </div>
            </nav>

            {visible.length === 0 ? (
              <div className="text-center py-4">
                <p className="text mb20">
                  {TABS.find((t) => t.key === tab).empty}
                </p>
                {tab === "open" && (
                  <Link href="/create-projects" className="ud-btn btn-thm">
                    Post a project <i className="fal fa-arrow-right-long" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="packages_table table-responsive">
                <table className="table-style3 table at-savesearch">
                  <thead className="t-head">
                    <tr>
                      <th scope="col">Project</th>
                      <th scope="col">Budget</th>
                      <th scope="col">Deadline</th>
                      <th scope="col">Proposals</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="t-body">
                    {visible.map((p) => (
                      <tr key={p.id}>
                        <th scope="row">
                          <Link href={`/project-single/${p.id}`} className="dark-color fw500">
                            {p.title}
                          </Link>
                          <p className="fz14 text mb-0">
                            {p.videoCount} × {labelOf(VIDEO_LENGTHS, p.videoLength)} ·{" "}
                            <span className={p.isOpen || isHired(p) ? "text-thm" : "text-muted"}>
                              {statusLabel(p)}
                            </span>
                          </p>
                        </th>
                        <td className="vam">
                          ${p.budgetPerVideo}/video
                          <p className="fz14 text mb-0">
                            total ${Math.round(p.budgetPerVideo * p.videoCount * 100) / 100}
                          </p>
                        </td>
                        <td className="vam">{formatDate(p.deadline)}</td>
                        <td className="vam">
                          <Link href={`/project-single/${p.id}`} className="text-thm fw500">
                            {p.proposalCount}
                          </Link>
                          <p className="fz13 text mb-0">
                            {[
                              p.pendingCount && `${p.pendingCount} new`,
                              p.acceptedCount && `${p.acceptedCount} accepted`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </td>
                        <td className="vam">
                          <ProjectOwnerActions project={p} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
