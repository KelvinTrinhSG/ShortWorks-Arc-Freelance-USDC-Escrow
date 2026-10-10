import RegisterSection from "@/components/auth/RegisterSection";
import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import { ACCOUNT_TYPES } from "@/data/talentOptions";

// /register?as=freelancer or ?as=client pre-selects the account type.
export default async function page({ searchParams }) {
    const { as } = await searchParams;
    const initialType = ACCOUNT_TYPES.some((t) => t.value === as) ? as : null;

    return (
        <>
            <div className="bgc-thm4">
                <Header20 />
                <RegisterSection initialType={initialType} />
                <Footer />
            </div>
        </>
    );
}
