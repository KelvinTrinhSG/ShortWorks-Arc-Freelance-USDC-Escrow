import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardNavigation from "@/components/dashboard/header/DashboardNavigation";
import ConnectPaypal from "@/components/dashboard/profile/ConnectPaypal";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import { PLATFORM_FEE_PERCENT, estimateEarnings } from "@/data/projectOptions";
import { getViewer } from "@/lib/viewer";
import Link from "next/link";

export const metadata = {
  title: "ShortWorks - PayPal",
};

const example = estimateEarnings(100);

// The freelancer's PayPal connection (docs/payments.md). proxy.js sends guests to /login.
export default async function page() {
  const viewer = await getViewer();
  const isFreelancer = viewer?.accountType === "freelancer";

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
                <h2>PayPal</h2>
                <p className="text">
                  Clients pay you through PayPal, straight into your own account.
                </p>
              </div>
            </div>
          </div>

          {isFreelancer ? (
            <>
              <div className="ps-widget bgc-white bdrs4 p30 mb30">
                <ConnectPaypal />
              </div>
              <div className="ps-widget bgc-white bdrs4 p30 mb30">
                <h5 className="mb15">How you get paid</h5>
                <ol className="ps-3 mb-0 text">
                  <li className="mb10">When a client hires you, PayPal holds the full amount on their account.</li>
                  <li className="mb10">When the client approves your videos (or after 3 days without an answer), the money goes to your PayPal account.</li>
                  <li className="mb10">
                    ShortWorks keeps a {PLATFORM_FEE_PERCENT}% platform fee and PayPal takes its processing fee.
                    On a $100 job you receive about ${example.net.toFixed(2)}.
                  </li>
                </ol>
                <Link href="/terms#payments" className="fz14 text-thm d-inline-block mt10">
                  Payment terms ↗
                </Link>
              </div>
            </>
          ) : (
            <div className="ps-widget bgc-white bdrs4 p30 mb30">
              <h5 className="mb10">PayPal is for freelancers</h5>
              <p className="text mb-0">
                As a client you pay with PayPal when you hire, from the proposal on your project page.
                No setup needed.
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
