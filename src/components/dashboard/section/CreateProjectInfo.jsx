import DashboardNavigation from "../header/DashboardNavigation";
import CreateProjectForm from "../project/CreateProjectForm";

export default function CreateProjectInfo() {
  return (
    <>
      <div className="dashboard__content hover-bgc-color">
        <div className="row pb40">
          <div className="col-lg-12">
            <DashboardNavigation />
          </div>
          <div className="col-lg-9">
            <div className="dashboard_title_area">
              <h2>Create Project</h2>
              <p className="text">
                Tell freelancers what to make, by when, for how much and in
                what style.
              </p>
            </div>
          </div>
        </div>
        <CreateProjectForm />
      </div>
    </>
  );
}
