import Footer2 from "@/components/footer/Footer2";
import Header2 from "@/components/header/Header2";
import Hero2 from "@/components/hero/Hero2";
import PopularProjects from "@/components/project/PopularProjects";
import TopFreelancers from "@/components/talent/TopFreelancers";
import WhyShortWorks from "@/components/section/WhyShortWorks";
import NeedSomething2 from "@/components/section/NeedSomething2";
import PopularServices from "@/components/service/PopularServices";

export const metadata = {
    title: "ShortWorks - Freelance Marketplace",
};

export default function page() {
    return (
        <>
            <div className="wrapper ovh">
                <Header2 />
                <Hero2 />
                <NeedSomething2 />
                <PopularServices />
                <PopularProjects />
                <TopFreelancers />
                <WhyShortWorks />
                <Footer2 />
            </div>
        </>
    );
}
