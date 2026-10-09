import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import OurFaqSection1 from "@/components/section/OurFaqSection1";

export const metadata = {
    title: "ShortWorks - Freelance Marketplace | Help",
};

export default function page() {
    return (
        <>
            <Header20 />
            <OurFaqSection1 />
            <Footer />
        </>
    );
}
