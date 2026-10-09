"use client";
import priceStore from "@/store/priceStore";

import Slider from "rc-slider";
export default function PriceRange1() {
  const priceRange = priceStore((state) => state.priceRange);
  const priceRangeHandler = priceStore((state) => state.priceRangeHandler);

  // price range handler
  const rangeHandler = (e) => {
    priceRangeHandler(e[0], e[1]);
  };

  return (
    <>
      <div className="price__range__box">
        <Slider
          range
          className="horizontal-slider"
          value={[priceRange.min, priceRange.max]}
          min={0}
          max={100000}
          onChange={rangeHandler}
        />
      </div>
    </>
  );
}
