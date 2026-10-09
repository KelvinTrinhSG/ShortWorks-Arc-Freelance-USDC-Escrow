import { freelancerBanner } from "@/data/categoryBanner";
import Breadcumb9 from "@/components/breadcumb/Breadcumb9";
import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";

import Listing13 from "@/components/section/Listing13";
import TabSection1 from "@/components/section/TabSection1";

export const metadata = {
    title: "ShortWorks - Freelance Marketplace | Freelancer 1",
};

export default function page() {
    return (
        <>
            <Header20 />
            <TabSection1 />
            <Breadcumb9 content={freelancerBanner} />
            <Listing13 />
            <Footer />
        </>
    );
}
