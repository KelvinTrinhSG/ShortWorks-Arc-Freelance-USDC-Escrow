export const shouldLoop = (slideCount, maxSlidesPerView) => {
  return slideCount >= maxSlidesPerView * 2;
};
