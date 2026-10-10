import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ManageJobInfo from "@/components/dashboard/section/ManageJobInfo";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import { getFreelancerJobs } from "@/lib/jobs";
import { getViewer } from "@/lib/viewer";

export const metadata = {
  title: "ShortWorks - Manage Jobs",
};

async function load() {
  // proxy.js already sends guests to /login.
  const viewer = await getViewer();
  const jobs = viewer?.accountType === "freelancer" ? await getFreelancerJobs(viewer.id) : [];
  // UTC date, the same calendar the deadlines are checked against on the server.
  return { viewer, jobs, today: new Date().toISOString().slice(0, 10) };
}

export default async function page() {
  const { viewer, jobs, today } = await load();
  return (
    <>
      <MobileNavigation2 />
      <DashboardLayout>
        <ManageJobInfo jobs={jobs} accountType={viewer?.accountType} today={today} />
      </DashboardLayout>
    </>
  );
}
