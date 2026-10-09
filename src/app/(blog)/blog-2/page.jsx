import Breadcumb2 from "@/components/breadcumb/Breadcumb2";
import Breadcumb3 from "@/components/breadcumb/Breadcumb3";
import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";

import BlogArea2 from "@/components/section/BlogArea2";

export const metadata = {
    title: "ShortWorks - Freelance Marketplace | Blog 2",
};

export default function page() {
    return (
        <>
            <Header20 />
            <Breadcumb3 path={["Home", "Services", "Design & Creative"]} />
            <Breadcumb2
                title="ShortWorks Blog"
                brief="Give your visitor a smooth online experience with a solid UX design"
            />
            <BlogArea2 />
            <Footer />
        </>
    );
}
