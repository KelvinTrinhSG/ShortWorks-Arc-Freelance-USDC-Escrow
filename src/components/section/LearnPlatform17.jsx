"use client";
import LearnPlatformCard from "../card/LearnPlatformCard";
import { Swiper, SwiperSlide } from "@/components/swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination } from "swiper/modules";
import { learnPlatform1 } from "@/data/project";

export default function LearnPlatform17() {
  return (
    <section className="bgc-thm4 pb90 pb30-md overflow-hidden">
      <div className="container">
        <div className="row align-items-center wow fadeInUp">
          <div className="col-lg-9 mx-auto">
            <div className="main-title text-center">
              <h2 className="title">People Love To Learn With ShortWorks</h2>
              <p className="paragraph">
                Lorem ipsum dolor sit amet, consectetur.
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="">
            <div
              className="ui-hightest-rated mb15 wow fadeInUp"
              data-wow-delay="300ms"
            >
              <Swiper
                slidesPerView={3}
                spaceBetween={30}
                navigation={{
                  prevEl: ".unique-7-pre",
                  nextEl: ".unique-7-next",
                }}
                modules={[Navigation, Pagination]}
                className="mySwiper"
                loop={true}
                pagination={{
                  el: ".unique-7-pagi",
                  clickable: true,
                }}
                breakpoints={{
                  0: {
                    slidesPerView: 1,
                  },
                  768: {
                    slidesPerView: 2,
                  },
                  992: {
                    slidesPerView: 3,
                  },
                  1200: {
                    slidesPerView: 3,
                  },
                }}
              >
                {learnPlatform1.map((item, index) => (
                  <SwiperSlide key={index}>
                    <LearnPlatformCard data={item} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
            <div className="row justify-content-center">
              <div className="col-auto">
                <button className="swiper__btn btn__prev__003 unique-7-pre">
                  <i className="far fa-arrow-left-long" />
                </button>
              </div>
              <div className="col-auto">
                <div className="swiper__pagination swiper__pagination__003 unique-7-pagi"></div>
              </div>
              <div className="col-auto">
                <button className="swiper__btn btn__next__003 unique-7-next">
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
