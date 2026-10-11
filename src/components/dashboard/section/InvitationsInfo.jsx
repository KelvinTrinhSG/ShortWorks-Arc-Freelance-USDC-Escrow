import Link from "next/link";
import { VIDEO_LENGTHS } from "@/data/projectOptions";
import { labelOf } from "@/data/talentOptions";
import DashboardNavigation from "../header/DashboardNavigation";
import { formatDate, timeAgo } from "../../project/ProjectCard";

// Projects a client invited this freelancer to. `invitations` and `now` come from the server page.
export default function InvitationsInfo({ invitations, accountType, now }) {
  const waiting = invitations.filter((i) => i.isOpen && !i.proposed && !i.declined).length;

  return (
    <div className="dashboard__content hover-bgc-color">
      <div className="row pb40">
        <div className="col-lg-12">
          <DashboardNavigation />
        </div>
        <div className="col-lg-12">
          <div className="dashboard_title_area">
            <h2>Invitations</h2>
            <p className="text">
              Clients who picked your profile and would like a proposal from you.
              {waiting > 0 && ` ${waiting} waiting for your answer.`}
            </p>
          </div>
        </div>
      </div>

      {accountType !== "freelancer" ? (
        <div className="ps-widget bgc-white bdrs4 p30 mb30">
          <h5 className="mb10">Invitations are for freelancers</h5>
          <p className="text mb20">
            Your account is a client account. Invite freelancers from one of your projects.
          </p>
          <Link href="/my-projects" className="ud-btn btn-thm">
            Manage Projects <i className="fal fa-arrow-right-long" />
          </Link>
        </div>
      ) : invitations.length === 0 ? (
        <div className="ps-widget bgc-white bdrs4 p30 mb30 text-center">
          <p className="text mb20">
            No invitations yet. A complete profile with portfolio videos helps
            clients find and invite you.
          </p>
          <Link href="/my-profile" className="ud-btn btn-thm">
            Improve my profile <i className="fal fa-arrow-right-long" />
          </Link>
        </div>
      ) : (
        <div className="ps-widget bgc-white bdrs4 p30 mb30 overflow-hidden position-relative">
          <div className="packages_table table-responsive">
            <table className="table-style3 table at-savesearch">
              <thead className="t-head">
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Budget</th>
                  <th scope="col">Deadline</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="t-body">
                {invitations.map((i) => {
                  const href = `/projects/${i.projectId}`;
                  return (
                    <tr key={i.projectId}>
                      <th scope="row">
                        <Link href={href} className="dark-color fw500">
                          {i.title}
                        </Link>
                        <p className="fz14 text mb-0">
                          {i.clientName} · {i.videoCount} × {labelOf(VIDEO_LENGTHS, i.videoLength)} ·
                          invited {timeAgo(i.invitedAt, now)}
                        </p>
                      </th>
                      <td className="vam">
                        ${Math.round(i.budgetPerVideo * i.videoCount * 100) / 100}
                        <p className="fz14 text mb-0">${i.budgetPerVideo}/video</p>
                      </td>
                      <td className="vam">{formatDate(i.deadline)}</td>
                      <td className="vam">
                        {i.proposed ? (
                          <Link href={href} className="btn btn-sm btn-outline-dark">
                            Proposal sent ✓
                          </Link>
                        ) : i.declined ? (
                          <span className="fz14 text-danger">Declined</span>
                        ) : i.isOpen ? (
                          <Link href={href} className="btn btn-sm btn-success">
                            Send proposal
                          </Link>
                        ) : (
                          <span className="fz14 text">No longer open</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
