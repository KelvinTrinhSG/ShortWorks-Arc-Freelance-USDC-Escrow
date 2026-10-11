"use client";
import { dashboardGroups } from "@/data/dashboard";
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
          {dashboardGroups(user?.accountType).map((group, g) => (
            <div key={group.key}>
              <p className={`fz15 fw400 ff-heading pl30 ${g > 0 ? "mt30" : ""}`}>{group.title}</p>
              {group.items.map((item) => (
                <div key={item.id} className="sidebar_list_item mb-1">
                  <Link
                    href={item.path}
                    onClick={item.name === "Logout" ? logout : undefined}
                    className={`items-center ${path === item.path ? "-is-active" : ""}`}
                  >
                    <i className={`${item.icon} mr15`} />
                    {item.name}
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
