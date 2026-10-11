import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import TalentDirectory from "@/components/talent/TalentDirectory";
import { getProjectInvitations } from "@/lib/invitations";
import { getProject } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

export const metadata = {
    title: "ShortWorks - Find Short-Form Video Talent",
};

// ?invite={projectId} turns on invite mode, but only for that project's owner while it is open.
async function loadInviteProject(projectId) {
    if (!projectId) return null;
    const found = await getProject(projectId, await getViewer());
    if (!found?.isOwner || !found.project.isOpen) return null;
    return {
        id: found.project.id,
        title: found.project.title,
        invitations: await getProjectInvitations(found.project.id),
    };
}

export default async function page({ searchParams }) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        if (typeof value === "string") params.set(key, value);
    }
    const inviteProject = await loadInviteProject(params.get("invite"));
    params.delete("invite");

    return (
        <>
            <Header20 />
            <TalentDirectory initialQuery={params.toString()} inviteProject={inviteProject} />
            <Footer />
        </>
    );
}
