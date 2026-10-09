import Breadcumb3 from "@/components/breadcumb/Breadcumb3";
import Breadcumb9 from "@/components/breadcumb/Breadcumb9";
import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";

import Listing4 from "@/components/section/Listing4";
import TabSection1 from "@/components/section/TabSection1";

export const metadata = {
    title: "ShortWorks - Freelance Marketplace | Service 4",
};

export default function page() {
    return (
        <>
            <Header20 />
            <TabSection1 />
            <Breadcumb3 path={["Home", "Services"]} showVideoCategory />
            <Breadcumb9
                title="Services List"
                description="Find short-form video editors and animators for your content."
            />
            <Listing4 />
            <Footer />
        </>
    );
}
