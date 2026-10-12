import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardNavigation from "@/components/dashboard/header/DashboardNavigation";
import ArcWallet from "@/components/dashboard/profile/ArcWallet";
import MobileNavigation2 from "@/components/header/MobileNavigation2";

export const metadata = {
  title: "ShortWorks - Pay With Arc",
};

// Connect a wallet and see its USDC balance on the Arc network. proxy.js sends guests to /login.
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
                <h2>Pay With Arc</h2>
                <p className="text">Connect your wallet to see your USDC balance on the Arc network.</p>
              </div>
            </div>
          </div>
          <div className="ps-widget bgc-white bdrs4 p30 mb30">
            <ArcWallet />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
