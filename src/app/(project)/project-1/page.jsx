import { projectBanner } from "@/data/categoryBanner";
import Breadcumb9 from "@/components/breadcumb/Breadcumb9";
import Header20 from "@/components/header/Header20";

import Listing8 from "@/components/section/Listing8";
import TabSection1 from "@/components/section/TabSection1";

export const metadata = {
    title: "ShortWorks - Freelance Marketplace | Project 1",
};

export default function page() {
    return (
        <>
            <Header20 />
            <TabSection1 />
            <Breadcumb9 content={projectBanner} />
            <Listing8 />
        </>
    );
}
