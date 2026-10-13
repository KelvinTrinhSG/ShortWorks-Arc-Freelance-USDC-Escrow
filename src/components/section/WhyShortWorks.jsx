"use client";
import {
  AUTO_APPROVE_HOURS,
  DISPUTE_DECISION_HOURS,
  MAX_DELIVERY_DAYS,
  PLATFORM_FEE_PERCENT,
} from "@/data/projectOptions";
import { Swiper, SwiperSlide } from "@/components/swiper";
import Link from "next/link";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination } from "swiper/modules";

// Home page section in place of the template's testimonials (LearnPlatform1): there are
// no real reviews yet, so it states how ShortWorks works instead. Numbers come from
// data/projectOptions.js so they stay true if the rules change.
const FACTS = [
  { value: "$0", label: "charged when you hire: PayPal only holds the money" },
  { value: `${DISPUTE_DECISION_HOURS}h`, label: "for ShortWorks to decide a dispute, every day of the week" },
  { value: `${AUTO_APPROVE_HOURS}h`, label: "to review each delivery before it's approved automatically" },
];

const SLIDES = [
  {
    title: "For clients",
    text: "Pay only for videos you approve. PayPal holds the money while the freelancer works and releases it when you're happy.",
    icon: "flaticon-secure",
    who: "Hire & pay",
    detail: "Protected by PayPal",
  },
  {
    title: "For freelancers",
    text: `Get paid straight into your own PayPal account. If the client goes quiet, the job is approved after ${AUTO_APPROVE_HOURS} hours.`,
    icon: "flaticon-dollar",
    who: "Connect PayPal once",
    detail: `${PLATFORM_FEE_PERCENT}% platform fee, nothing else`,
  },
  {
    title: "Made for 9:16",
    text: "Briefs, reference videos, samples and deliveries are all built around TikTok, Reels and Shorts.",
    icon: "flaticon-video-file",
    who: "Short-form only",
    detail: `Delivered within ${MAX_DELIVERY_DAYS} days`,
  },
  {
    title: "If something goes wrong",
    text: "Open a dispute from the job page. The ShortWorks team decides: the freelancer is paid in full, or the money is released to you.",
    icon: "flaticon-review",
    who: "Fair, all-or-nothing decisions",
    detail: `Within ${DISPUTE_DECISION_HOURS} hours`,
  },
];

export default function WhyShortWorks() {
  return (
    <section className="bgc-thm3">
      <div className="container">
        <div className="row align-items-md-center">
          <div className="col-md-6 col-lg-8 mb30-md wow fadeInUp" data-wow-delay="100ms">
            <div className="main-title">
              <h2 className="title">Short-form video, safe to buy and sell</h2>
              <p className="paragraph">
                Brands get scroll-stopping videos, freelancers get paid on time, and PayPal sits in
                between.{" "}
                <Link href="/terms" className="text-thm">
                  How it works
                </Link>
              </p>
            </div>
            <div className="row">
              {FACTS.map((f) => (
                <div key={f.label} className="col-sm-6 col-lg-4">
                  <div className="funfact_one">
                    <div className="details">
                      <h2 className="mb10">{f.value}</h2>
                      <p className="text mb-0">{f.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-6 col-lg-4 col-xl-4">
            <div className="ui-hightest-rated mb15 wow fadeInUp" data-wow-delay="300ms">
              <Swiper
                slidesPerView={1}
                spaceBetween={30}
                navigation={{ prevEl: ".btn__prev__003", nextEl: ".btn__next__003" }}
                modules={[Navigation, Pagination]}
                className="mySwiper"
                loop={true}
                pagination={{ el: ".swiper__pagination__003", clickable: true }}
              >
                {SLIDES.map((s) => (
                  <SwiperSlide key={s.title}>
                    <div className="testimonial-style1 default-box-shadow1 position-relative bdrs16">
                      <div className="testimonial-content">
                        <h4 className="title text-thm">{s.title}</h4>
                        <h4 className="t_content">{s.text}</h4>
                      </div>
                      <div className="thumb d-flex align-items-center">
                        <span
                          className={`${s.icon} text-thm d-inline-flex align-items-center justify-content-center flex-shrink-0 bdrs12`}
                          style={{ width: 60, height: 60, fontSize: 28, background: "#eaf7ef" }}
                        />
                        <div className="flex-grow-1 ms-3">
                          <h6 className="mb-0">{s.who}</h6>
                          <p className="fz14 mb-0">{s.detail}</p>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
            <div className="row justify-content-center">
              <div className="col-auto">
                <button className="swiper__btn btn__prev__003" aria-label="Previous">
                  <i className="far fa-arrow-left-long" />
                </button>
              </div>
              <div className="col-auto">
                <div className="swiper__pagination swiper__pagination__003"></div>
              </div>
              <div className="col-auto">
                <button className="swiper__btn btn__next__003" aria-label="Next">
                  <i className="far fa-arrow-right-long" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
