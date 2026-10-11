import EmployerDirectory from "@/components/employer/EmployerDirectory";
import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";

export const metadata = {
  title: "ShortWorks - Find Employers",
};

export default async function page({ searchParams }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  return (
    <>
      <Header20 />
      <EmployerDirectory initialQuery={params.toString()} />
      <Footer />
    </>
  );
}
