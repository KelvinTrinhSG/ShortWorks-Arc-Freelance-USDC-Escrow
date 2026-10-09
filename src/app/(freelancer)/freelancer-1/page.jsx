import Breadcumb16 from "@/components/breadcumb/Breadcumb16";
import Breadcumb3 from "@/components/breadcumb/Breadcumb3";
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
            <Breadcumb3 path={["Home", "Freelancers"]} showVideoCategory />
            <Breadcumb16 />
            <Listing13 />
            <Footer />
        </>
    );
}
