import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import JobDirectory from "@/components/project/JobDirectory";
import { getViewer } from "@/lib/viewer";

export const metadata = {
    title: "ShortWorks - Jobs",
};

// Projects move here from /projects once the client accepts a proposal (docs/jobs.md).
export default async function page({ searchParams }) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        if (typeof value === "string") params.set(key, value);
    }
    const viewer = await getViewer();

    return (
        <>
            <Header20 />
            <JobDirectory
                initialQuery={params.toString()}
                accountType={viewer?.accountType ?? null}
                // UTC date, the same calendar the delivery dates are checked against on the server.
                today={new Date().toISOString().slice(0, 10)}
            />
            <Footer />
        </>
    );
}
