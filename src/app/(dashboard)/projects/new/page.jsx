import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CreateProjectInfo from "@/components/dashboard/section/CreateProjectInfo";

import MobileNavigation2 from "@/components/header/MobileNavigation2";
import { getProject, projectFormState } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

export const metadata = {
  title:
    "ShortWorks - Freelance Marketplace | Create Project",
};

// /projects/new?from={id} (Duplicate): the form starts as a copy of one of the client's own
// projects. Anyone else's project, or a service order, gives an empty form.
export default async function page({ searchParams }) {
  const { from } = await searchParams;
  let copy = null;
  if (from) {
    const data = await getProject(from, await getViewer());
    if (data?.isOwner && !data.project.serviceId) copy = data.project;
  }

  return (
    <>

    <MobileNavigation2 />
      <DashboardLayout>
        <CreateProjectInfo
          initial={copy ? projectFormState(copy, { copy: true }) : undefined}
          copiedFrom={copy ? { id: copy.id, title: copy.title } : undefined}
        />
      </DashboardLayout>
    </>
  );
}
