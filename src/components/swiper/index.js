"use client";

import { Children, useMemo } from "react";
import { Swiper as OriginalSwiper } from "swiper/react";

export { SwiperSlide } from "swiper/react";

export function Swiper({ children, loop, breakpoints, slidesPerView, ...props }) {
  const maxSlidesPerView = useMemo(() => {
    let max = slidesPerView ? Number(slidesPerView) : 1;
    if (breakpoints) {
      Object.values(breakpoints).forEach((bp) => {
        if (bp && bp.slidesPerView) {
          max = Math.max(max, Number(bp.slidesPerView));
        }
      });
    }
    return max;
  }, [breakpoints, slidesPerView]);

  const slideCount = Children.count(children);
  const enableLoop = !!loop && slideCount >= maxSlidesPerView * 2;

  return (
    <OriginalSwiper
      {...props}
      loop={enableLoop}
      breakpoints={breakpoints}
      slidesPerView={slidesPerView}
    >
      {children}
    </OriginalSwiper>
  );
}
