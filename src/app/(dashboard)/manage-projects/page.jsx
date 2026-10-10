import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ManageProjectInfo from "@/components/dashboard/section/ManageProjectInfo";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import { getOwnedProjects } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

export const metadata = {
  title: "ShortWorks - Manage Projects",
};

export default async function page() {
  // proxy.js already sends guests to /login.
  const viewer = await getViewer();
  const projects = viewer?.accountType === "client" ? await getOwnedProjects(viewer.id) : [];

  return (
    <>
      <MobileNavigation2 />
      <DashboardLayout>
        <ManageProjectInfo projects={projects} accountType={viewer?.accountType} />
      </DashboardLayout>
    </>
  );
}
