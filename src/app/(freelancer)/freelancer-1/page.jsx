import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import TalentDirectory from "@/components/talent/TalentDirectory";

export const metadata = {
    title: "ShortWorks - Find Short-Form Video Talent",
};

export default async function page({ searchParams }) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        if (typeof value === "string") params.set(key, value);
    }

    return (
        <>
            <Header20 />
            <TalentDirectory initialQuery={params.toString()} />
            <Footer />
        </>
    );
}
