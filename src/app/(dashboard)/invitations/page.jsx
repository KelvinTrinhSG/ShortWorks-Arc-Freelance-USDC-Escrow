import DashboardLayout from "@/components/dashboard/DashboardLayout";
import InvitationsInfo from "@/components/dashboard/section/InvitationsInfo";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import { getFreelancerInvitations } from "@/lib/invitations";
import { getViewer } from "@/lib/viewer";

export const metadata = {
  title: "ShortWorks - Invitations",
};

async function load() {
  // proxy.js already sends guests to /login.
  const viewer = await getViewer();
  const invitations =
    viewer?.accountType === "freelancer" ? await getFreelancerInvitations(viewer.id) : [];
  return { viewer, invitations, now: Date.now() };
}

export default async function page() {
  const { viewer, invitations, now } = await load();
  return (
    <>
      <MobileNavigation2 />
      <DashboardLayout>
        <InvitationsInfo invitations={invitations} accountType={viewer?.accountType} now={now} />
      </DashboardLayout>
    </>
  );
}
