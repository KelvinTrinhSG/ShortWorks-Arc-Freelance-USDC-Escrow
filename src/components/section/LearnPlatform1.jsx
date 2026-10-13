"use client";
import LearnPlatformCard from "../card/LearnPlatformCard";
import { Swiper, SwiperSlide } from "@/components/swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination } from "swiper/modules";
import { learnPlatform1 } from "@/data/project";
import CountUp from "react-countup";
import { usePathname } from "next/navigation";

export default function LearnPlatform1() {
  const path = usePathname();

  return (
    <>
      <section
        className={`
                ${path === "/home-9" ? "bgc-light-yellow" : "bgc-thm3"}
                ${path === "/home-14" ? "bgc-violet" : "bgc-thm3"}
                `}
      >
        <div className="container">
          <div className="row align-items-md-center">
            <div
              className="col-md-6 col-lg-8 mb30-md wow fadeInUp"
              data-wow-delay="100ms"
            >
              <div className="main-title">
                <h2 className="title">People Love To Learn With ShortWorks</h2>
                <p className="paragraph">
                  Lorem ipsum dolor sit amet, consectetur.
                </p>
              </div>
              <div className="row">
                <div className="col-sm-6 col-lg-4">
                  <div className="funfact_one">
                    <div className="details">
                      <ul className="ps-0 d-flex mb-0">
                        <li>
                          <div className="timer">
                            <CountUp
                              decimals={1}
                              end={4.9}
                              duration={2.75}
                              enableScrollSpy
                            />
                          </div>
                        </li>
                        <li>
                          <span>/</span>
                        </li>
                        <li>
                          <div className="timer">
                            <CountUp end={5} duration={5} enableScrollSpy />
                          </div>
                        </li>
                      </ul>
                      <p className="text mb-0">
                        Clients rate professionals on ShortWorks
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="funfact_one">
                    <div className="details">
                      <ul className="ps-0 d-flex mb-0">
                        <li>
                          <div className="timer">
                            <CountUp end={99} duration={2.75} enableScrollSpy />
                          </div>
                        </li>
                        <li>
                          <span>%</span>
                        </li>
                      </ul>
                      <p className="text mb-0">
                        95% of customers are satisfied <br /> through to see
                        their freelancers
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6 col-lg-4">
                  <div className="funfact_one">
                    <div className="details">
                      <h2>Award winner</h2>
                      <p className="text mb-0">Home ownership</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 col-xl-4">
              <div
                className="ui-hightest-rated mb15 wow fadeInUp"
                data-wow-delay="300ms"
              >
                <Swiper
                  slidesPerView={1}
                  spaceBetween={30}
                  navigation={{
                    prevEl: ".btn__prev__003",
                    nextEl: ".btn__next__003",
                  }}
                  modules={[Navigation, Pagination]}
                  className="mySwiper"
                  loop={true}
                  pagination={{
                    el: ".swiper__pagination__003",
                    clickable: true,
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
                  <button className="swiper__btn btn__prev__003">
                    <i className="far fa-arrow-left-long" />
                  </button>
                </div>
                <div className="col-auto">
                  <div className="swiper__pagination swiper__pagination__003"></div>
                </div>
                <div className="col-auto">
                  <button className="swiper__btn btn__next__003">
                    <i className="far fa-arrow-right-long" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
