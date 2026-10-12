import Image from "next/image";

// The template's banner decoration (from Breadcumb9): two color shapes that zoom in
// when the banner appears (WOW.js) and a picture that floats up and down (bounce-y).
// Put it first inside a `cta-banner … position-relative overflow-hidden` box, and add
// `wow fadeInUp` to the content row so the text slides in. Give the content box
// `position-relative zi1` so the text sits above the shapes.
// `art`: the page's illustration in public/images/banners/ (532x300 SVG):
// services | projects | jobs | freelancers | employers.
export default function BannerDecor({ art }) {
  return (
    <>
      <Image height={226} width={198} className="left-top-img wow zoomIn" src="/images/vector-img/left-top.png" alt="" />
      <Image height={181} width={255} className="right-bottom-img wow zoomIn" src="/images/vector-img/right-bottom.png" alt="" />
      {art && (
        <Image
          height={300}
          width={532}
          className="service-v1-vector bounce-y d-none d-xl-block"
          src={`/images/banners/${art}.svg`}
          alt=""
          unoptimized
        />
      )}
    </>
  );
}
