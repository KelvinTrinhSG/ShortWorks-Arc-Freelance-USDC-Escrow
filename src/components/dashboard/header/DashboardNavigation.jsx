"use client";
import { dashboardGroups } from "@/data/dashboard";
import authStore, { useCurrentUser } from "@/store/authStore";
import Link from "next/link";
import { Fragment, useState } from "react";
import { usePathname } from "next/navigation";
export default function DashboardNavigation() {
  const [isActive, setActive] = useState(false);
  const path = usePathname()
  const logout = authStore((state) => state.logout);
  const user = useCurrentUser();

  return (
    <>
      <div className="dashboard_navigationbar d-block d-lg-none">
        <div className="dropdown">
          <button onClick={() => setActive(!isActive)} className="dropbtn">
            <i className="fa fa-bars pr10" /> Dashboard Navigation
          </button>
          <ul className={`dropdown-content ${isActive ? "show" : ""}`}>
            {dashboardGroups(user?.accountType).map((group) => (
              <Fragment key={group.key}>
                <li>
                  <p className="fz15 fw400 ff-heading mt30 pl30">{group.title}</p>
                </li>
                {group.items.map((item) => (
                  <li
                    className={path == item.path ? "mobile-dasboard-menu-active" : ""}
                    onClick={() => setActive(false)}
                    key={item.id}
                  >
                    <Link href={item.path} onClick={item.name === "Logout" ? logout : undefined}>
                      {item.img ? (
                        <img src={item.img} alt="" width={18} height={18} className="mr10" />
                      ) : (
                        <i className={`${item.icon} mr10`} />
                      )}
                      {item.name}
                    </Link>
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
