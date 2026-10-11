import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardNavigation from "@/components/dashboard/header/DashboardNavigation";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import ManageServices from "@/components/service/ManageServices";
import { getOwnedServices } from "@/lib/services";
import { getViewer } from "@/lib/viewer";
import Link from "next/link";

export const metadata = {
  title: "ShortWorks - Manage Services",
};

// proxy.js already sends guests to /login.
export default async function page() {
  const viewer = await getViewer();
  const isFreelancer = viewer?.accountType === "freelancer";
  const services = isFreelancer ? await getOwnedServices(viewer.id) : [];

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
              <div className="dashboard_title_area">
                <h2>Manage Services</h2>
                <p className="text">Your ready-made offers. Orders show up in Jobs once the client pays.</p>
              </div>
            </div>
            {isFreelancer && (
              <div className="col-lg-3">
                <div className="text-lg-end">
                  <Link href="/add-services" className="ud-btn btn-dark default-box-shadow2">
                    Add Service <i className="fal fa-arrow-right-long" />
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="ps-widget bgc-white bdrs4 p30 mb30 overflow-hidden position-relative">
            {isFreelancer ? (
              <ManageServices services={services} />
            ) : (
              <>
                <h5 className="mb10">Services are offered by freelancers</h5>
                <p className="text mb20">Your account is a client account. Browse services and order the one you need.</p>
                <Link href="/service-4" className="ud-btn btn-thm">
                  Browse services <i className="fal fa-arrow-right-long" />
                </Link>
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
