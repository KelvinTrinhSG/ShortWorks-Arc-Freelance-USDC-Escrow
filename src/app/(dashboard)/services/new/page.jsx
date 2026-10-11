import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardNavigation from "@/components/dashboard/header/DashboardNavigation";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import ServiceForm from "@/components/service/ServiceForm";

export const metadata = {
  title: "ShortWorks - Add Service",
};

// A freelancer publishes a service clients can order and pay for (docs/services.md).
export default function page() {
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
                <h2>Add Service</h2>
                <p className="text">
                  A ready-made offer: one price per video and a delivery time. Clients order and pay
                  on the service page, and it becomes a job right away.
                </p>
              </div>
            </div>
          </div>
          <ServiceForm />
        </div>
      </DashboardLayout>
    </>
  );
}
