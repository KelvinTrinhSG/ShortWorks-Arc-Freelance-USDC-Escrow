"use client";
import listingStore from "@/store/listingStore";

// banner heading that follows the selected video category tab
export default function CategoryHeading({ content, textClassName = "text" }) {
  const getVideoCategory = listingStore((state) => state.getVideoCategory);
  const { title, description } =
    content[getVideoCategory] ?? content["All Categories"];

  return (
    <>
      <h2>{title}</h2>
      <p className={textClassName}>{description}</p>
    </>
  );
}
