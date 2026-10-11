"use client";
import Link from "next/link";
import { useState } from "react";
import { VIDEO_LENGTHS } from "@/data/projectOptions";
import { labelOf } from "@/data/talentOptions";
import DashboardNavigation from "../header/DashboardNavigation";
import { JobStatusBadge, jobStage } from "../../project/JobCard";
import { dueLabel, formatDate } from "../../project/ProjectCard";

// Freelancer's jobs = accepted proposals. `jobs` and `today` come from the server page.
export default function ManageJobInfo({ jobs, accountType, today }) {
  const stage = (j) => jobStage(j.jobStatus, j.deliveryDate, today);
  const tabs = [
    { key: "active", label: "Active", test: (j) => ["in_progress", "submitted", "disputed"].includes(stage(j)) },
    { key: "overdue", label: "Overdue", test: (j) => stage(j) === "overdue" },
    { key: "completed", label: "Completed", test: (j) => stage(j) === "completed" },
  ];
  const [tab, setTab] = useState("active");
  const visible = jobs.filter(tabs.find((t) => t.key === tab).test);

  return (
    <div className="dashboard__content hover-bgc-color">
      <div className="row pb40">
        <div className="col-lg-12">
          <DashboardNavigation />
        </div>
        <div className="col-lg-9">
          <div className="dashboard_title_area">
            <h2>Manage Jobs</h2>
            <p className="text">
              Projects where the client accepted your proposal. Open a job to
              see the brief, the agreed terms and your delivery date.
            </p>
          </div>
        </div>
        {accountType === "freelancer" && (
          <div className="col-lg-3">
            <div className="text-lg-end">
              <Link href="/project-1" className="ud-btn btn-dark default-box-shadow2">
                Find more work
                <i className="fal fa-arrow-right-long" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {accountType !== "freelancer" ? (
        <div className="ps-widget bgc-white bdrs4 p30 mb30">
          <h5 className="mb10">Jobs are for freelancers</h5>
          <p className="text mb20">
            Your account is a client account. Follow the freelancers you hired
            from your projects.
          </p>
          <Link href="/manage-projects" className="ud-btn btn-thm">
            Manage Projects <i className="fal fa-arrow-right-long" />
          </Link>
        </div>
      ) : (
        <div className="ps-widget bgc-white bdrs4 p30 mb30 overflow-hidden position-relative">
          <div className="navtab-style1">
            <nav>
              <div className="nav nav-tabs mb30">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`nav-link fw500 ps-0 ${tab === t.key ? "active" : ""}`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label} ({jobs.filter(t.test).length})
                  </button>
                ))}
              </div>
            </nav>

            {visible.length === 0 ? (
              <div className="text-center py-4">
                <p className="text mb20">
                  {tab === "active"
                    ? "No active jobs yet. When a client accepts your proposal, the job shows up here."
                    : tab === "overdue"
                      ? "Nothing overdue."
                      : "No completed jobs yet."}
                </p>
                {tab === "active" && (
                  <Link href="/project-1" className="ud-btn btn-thm">
                    Browse projects <i className="fal fa-arrow-right-long" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="packages_table table-responsive">
                <table className="table-style3 table at-savesearch">
                  <thead className="t-head">
                    <tr>
                      <th scope="col">Job</th>
                      <th scope="col">Earnings</th>
                      <th scope="col">Your delivery date</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody className="t-body">
                    {visible.map((j) => {
                      const due = dueLabel(j.deliveryDate, today);
                      return (
                        <tr key={j.id}>
                          <th scope="row">
                            <Link href={`/job-single/${j.id}`} className="dark-color fw500">
                              {j.title}
                            </Link>
                            <p className="fz14 text mb-0">
                              {j.clientName} · {j.videoCount} × {labelOf(VIDEO_LENGTHS, j.videoLength)}
                            </p>
                          </th>
                          <td className="vam">
                            ${j.total}
                            <p className="fz14 text mb-0">${j.pricePerVideo}/video</p>
                          </td>
                          <td className="vam">
                            {formatDate(j.deliveryDate)}
                            {j.jobStatus === "in_progress" ? (
                              <p className={`fz14 mb-0 ${due.className}`}>{due.text}</p>
                            ) : (
                              <div className="mt5">
                                <JobStatusBadge status={j.jobStatus} deliveryDate={j.deliveryDate} today={today} />
                              </div>
                            )}
                          </td>
                          <td className="vam">
                            <Link href={`/job-single/${j.id}`} className="btn btn-sm btn-outline-dark">
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
