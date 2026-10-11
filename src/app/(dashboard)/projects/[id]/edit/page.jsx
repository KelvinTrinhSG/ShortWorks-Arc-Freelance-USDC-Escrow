import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardNavigation from "@/components/dashboard/header/DashboardNavigation";
import CreateProjectForm from "@/components/dashboard/project/CreateProjectForm";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import { getProject } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  title: "ShortWorks - Edit Project",
};

export default async function page({ params }) {
  const { id } = await params;
  const viewer = await getViewer();
  const data = await getProject(id, viewer);
  // Only the client who posted it may edit; everyone else gets a 404.
  if (!data?.isOwner) notFound();
  const p = data.project;

  // Same shape as the Create Project form state.
  const initial = {
    title: p.title,
    platforms: p.platforms,
    workType: p.workType,
    videoCount: String(p.videoCount),
    videoLength: p.videoLength,
    brief: p.brief,
    deadline: p.deadline,
    budgetPerVideo: String(p.budgetPerVideo),
    references: p.references,
  };

  return (
    <>
      <MobileNavigation2 />
      <DashboardLayout>
        <div className="dashboard__content hover-bgc-color">
          <div className="row pb40">
            <div className="col-lg-12">
              <DashboardNavigation />
            </div>
            <div className="col-lg-9">
              <div className="dashboard_title_area">
                <h2>Edit Project</h2>
                <p className="text">
                  Changes show up right away for freelancers.{" "}
                  {p.proposalCount > 0 &&
                    `${p.proposalCount} ${p.proposalCount === 1 ? "freelancer has" : "freelancers have"} already sent a proposal based on the current version.`}{" "}
                  <Link href={`/projects/${p.id}`} className="text-thm">
                    View project
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <CreateProjectForm projectId={p.id} initial={initial} />
        </div>
      </DashboardLayout>
    </>
  );
}
