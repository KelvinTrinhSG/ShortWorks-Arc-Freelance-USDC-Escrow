"use client";
import listingStore from "@/store/listingStore";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const categories = [
  "All Categories",
  "Short-Form Video Editor",
  "Short-Form Video Animator",
];

// categories_list_section overflow-hidden

export default function TabSection1() {
  const getCurrentTab = listingStore((state) => state.getVideoCategory);
  const setCurrentTab = listingStore((state) => state.setVideoCategory);

  const path = usePathname();

  // start each page on "All Categories"
  useEffect(() => {
    setCurrentTab("All Categories");
  }, [path, setCurrentTab]);

  return (
    <>
      <section
        className={`categories_list_section overflow-hidden ${
          path === "/home-3" ? "bgc-thm5" : ""
        }`}
      >
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="listings_category_nav_list_menu">
                <ul className="mb0 d-flex ps-0">
                  {categories.map((item, index) => (
                    <li key={index}>
                      <a
                        onClick={() => setCurrentTab(item)}
                        className={getCurrentTab == item ? "active" : ""}
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
