import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardNavigation from "@/components/dashboard/header/DashboardNavigation";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import ServiceForm from "@/components/service/ServiceForm";
import { getServiceForEdit } from "@/lib/services";
import { getViewer } from "@/lib/viewer";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  title: "ShortWorks - Edit Service",
};

export default async function page({ params }) {
  const { id } = await params;
  const viewer = await getViewer();
  // Only the freelancer who offers it may edit; everyone else gets a 404.
  const initial = viewer ? await getServiceForEdit(id, viewer.id) : null;
  if (!initial) notFound();

  return (
    <>
      <MobileNavigation2 />
      <DashboardLayout>
        <div className="dashboard__content hover-bgc-color">
          <div className="row pb40">
            <div className="col-lg-12">
              <DashboardNavigation />
            </div>
            <div className="col-lg-9">
              <Link href="/my-services" className="fz14 text-thm">
                ← Manage Services
              </Link>
              <div className="dashboard_title_area mt10">
                <h2>Edit Service</h2>
                <p className="text">Changes apply to new orders. Orders already placed keep their price and delivery date.</p>
              </div>
            </div>
          </div>
          <ServiceForm serviceId={Number(id)} initial={initial} />
        </div>
      </DashboardLayout>
    </>
  );
}
