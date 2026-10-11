import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import ServiceDirectory from "@/components/service/ServiceDirectory";

export const metadata = {
  title: "ShortWorks - Short-Form Video Services",
};

// The home page search sends ?category=<role>&q=: map its roles to a type of work.
const CATEGORY_TO_WORK_TYPE = {
  "Short-Form Video Editor": "editing",
  "Short-Form Video Animator": "motion",
};

export default async function page({ searchParams }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const workType = CATEGORY_TO_WORK_TYPE[params.get("category")];
  params.delete("category");
  if (workType && !params.get("workType")) params.set("workType", workType);

  return (
    <>
      <Header20 />
      <ServiceDirectory initialQuery={params.toString()} />
      <Footer />
    </>
  );
}
