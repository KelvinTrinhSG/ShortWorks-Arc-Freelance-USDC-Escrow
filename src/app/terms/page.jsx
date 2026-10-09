import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import TermsCondition1 from "@/components/section/TermsCondition1";

export const metadata = {
    title: "ShortWorks - Freelance Marketplace | Terms & Conditions",
};

export default function page() {
    return (
        <>
            <Header20 />
            <TermsCondition1 />
            <Footer />
        </>
    );
}
