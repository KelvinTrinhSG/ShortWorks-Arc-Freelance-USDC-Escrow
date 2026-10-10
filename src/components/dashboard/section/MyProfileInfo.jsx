import DashboardNavigation from "../header/DashboardNavigation";
import TalentProfile from "../profile/TalentProfile";
import ChangePassword from "./ChangePassword";
import ConfirmPassword from "./ConfirmPassword";

export default function MyProfileInfo() {
  return (
    <>
      <div className="dashboard__content hover-bgc-color">
        <div className="row pb40">
          <div className="col-lg-12">
            <DashboardNavigation />
          </div>
          <div className="col-lg-9">
            <div className="dashboard_title_area">
              <h2>My Profile</h2>
              <p className="text">
                Show clients what you make, what it costs and how fast you
                deliver.
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-xl-12">
            <TalentProfile />
            <ChangePassword />
            <ConfirmPassword />
          </div>
        </div>
      </div>
    </>
  );
}
