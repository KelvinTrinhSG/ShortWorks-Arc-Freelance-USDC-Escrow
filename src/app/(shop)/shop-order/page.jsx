import OrderComplete1 from "@/components/element/OrderComplete1";
import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";

export const metadata = {
    title: "ShortWorks - Freelance Marketplace | Shop Order",
};

export default function page() {
    return (
        <>
            <Header20 />
            <OrderComplete1 />
            <Footer />
        </>
    );
}
