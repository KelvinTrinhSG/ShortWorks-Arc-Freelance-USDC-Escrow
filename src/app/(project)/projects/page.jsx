import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import ProjectDirectory from "@/components/project/ProjectDirectory";

export const metadata = {
    title: "ShortWorks - Short-Form Video Projects",
};

export default async function page({ searchParams }) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        if (typeof value === "string") params.set(key, value);
    }

    return (
        <>
            <Header20 />
            <ProjectDirectory initialQuery={params.toString()} />
            <Footer />
        </>
    );
}
