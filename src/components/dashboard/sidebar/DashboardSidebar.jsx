"use client";
import { dasboardNavigation, visibleFor } from "@/data/dashboard";
import authStore, { useCurrentUser } from "@/store/authStore";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardSidebar() {
  const path = usePathname();
  const logout = authStore((state) => state.logout);
  const user = useCurrentUser();

  return (
    <>
      <div className="dashboard__sidebar d-none d-lg-block">
        <div className="dashboard_sidebar_list">
          <p className="fz15 fw400 ff-heading pl30">Start</p>
          {dasboardNavigation.slice(0, 8).map((item,i) => (
            <div key={ i } className="sidebar_list_item mb-1">
              <Link
                href={item.path}
                className={`items-center ${
                  path === item.path ? "-is-active" : ""
                }`}
              >
                <i className={`${item.icon} mr15`} />
                {item.name}
              </Link>
            </div>
          ))}

          <p className="fz15 fw400 ff-heading pl30 mt30">Organize and Manage</p>

          {dasboardNavigation.slice(8, 13).filter(visibleFor(user?.accountType)).map((item,i) => (
            <div key={ i } className="sidebar_list_item mb-1">
              <Link
                href={item.path}
                className={`items-center ${
                  path === item.path ? "-is-active" : ""
                }`}
              >
                <i className={`${item.icon} mr15`} />
                {item.name}
              </Link>
            </div>
          ))}

          <p className="fz15 fw400 ff-heading pl30 mt30">Account</p>
          {dasboardNavigation.slice(13, 15).map((item,i) => (
            <div key={ i } className="sidebar_list_item mb-1">
              <Link
                href={item.path}
                onClick={item.name === "Logout" ? logout : undefined}
                className={`items-center ${
                  path === item.path ? "-is-active" : ""
                }`}
              >
                <i className={`${item.icon} mr15`} />
                {item.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
