"use client";
import listingStore from "@/store/listingStore";

export default function Breadcumb3({ path, showVideoCategory = false }) {
  const getVideoCategory = listingStore((state) => state.getVideoCategory);

  // append the selected category tab, if any
  const items =
    showVideoCategory && getVideoCategory !== "All Categories"
      ? [...path, getVideoCategory]
      : path;

  return (
    <>
      <section className="breadcumb-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="breadcumb-style1">
                <div className="breadcumb-list">
                  {items?.map((item, i) => (
                    <a key={i}>{item}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
