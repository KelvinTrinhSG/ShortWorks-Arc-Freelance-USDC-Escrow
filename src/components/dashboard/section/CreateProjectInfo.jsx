import Link from "next/link";
import DashboardNavigation from "../header/DashboardNavigation";
import CreateProjectForm from "../project/CreateProjectForm";

// `initial` and `copiedFrom` are set when duplicating a project (/projects/new?from={id}).
export default function CreateProjectInfo({ initial, copiedFrom }) {
  return (
    <>
      <div className="dashboard__content hover-bgc-color">
        <div className="row pb40">
          <div className="col-lg-12">
            <DashboardNavigation />
          </div>
          <div className="col-lg-9">
            <div className="dashboard_title_area">
              <h2>Create Project</h2>
              <p className="text">
                {copiedFrom ? (
                  <>
                    A copy of{" "}
                    <Link href={`/projects/${copiedFrom.id}`} className="text-thm">
                      {copiedFrom.title}
                    </Link>
                    . Change what you need, then publish it as a new project.
                  </>
                ) : (
                  "Tell freelancers what to make, by when, for how much and in what style."
                )}
              </p>
            </div>
          </div>
        </div>
        <CreateProjectForm initial={initial} />
      </div>
    </>
  );
}
