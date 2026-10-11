"use client";
import { useState } from "react";
import CountUp from "react-countup";
import HeroSearch1 from "../element/HeroSearch1";
import Image from "next/image";
import { useRouter } from "next/navigation";

const role = [
  "Choose Category",
  "Short-Form Video Editor",
  "Short-Form Video Animator",
];

export default function Hero2() {
  const [getSelectedRole, setSelectedRole] = useState(null);
  const [getKeyword, setKeyword] = useState("");

  // choose a category
  const roleHandler = (select) => {
    setSelectedRole(select);
  };

  const router = useRouter();

  // search handler
  const searchHandler = () => {
    const params = new URLSearchParams();
    if (getSelectedRole && getSelectedRole !== "Choose Category") {
      params.set("category", getSelectedRole);
    }
    if (getKeyword.trim() !== "") {
      params.set("q", getKeyword.trim());
    }
    const query = params.toString();
    router.push(query ? `/services?${query}` : "/services");
  };

  return (
    <>
      <section className="hero-home2 pb100-xs">
        <div className="container">
          <div className="row mb60 mb0-xl">
            <div className="col-xl-7">
              <div className="pr30 pr0-lg mb30-md position-relative">
                <h1 className="animate-up-1 mb25 text-white">
                  Hire short-form video{" "}
                  <br className="d-none d-xl-block" />
                  talent that stops the scroll
                </h1>
                <p className="text-white animate-up-2">
                  Work with skilled video editors and animators to create Reels,
                  TikToks <br className="d-none d-lg-block" /> and Shorts that
                  grow your brand — fast and on budget
                </p>
                <div className="advance-search-tab bgc-white p10 bdrs4-sm bdrs60 banner-btn position-relative zi1 animate-up-3 mt30">
                  <div className="row">
                    <div className="col-md-5 col-lg-6 col-xl-6">
                      <div className="advance-search-field mb10-sm">
                        <HeroSearch1
                          onChange={setKeyword}
                          onSubmit={searchHandler}
                        />
                      </div>
                    </div>
                    <div className="col-md-4 col-lg-4 col-xl-3">
                      <div className="bselect-style1 bdrl1 bdrn-sm">
                        <div className="dropdown bootstrap-select">
                          <button
                            type="button"
                            className="btn dropdown-toggle btn-light"
                            data-bs-toggle="dropdown"
                          >
                            <div className="filter-option">
                              <div className="filter-option-inner">
                                <div className="filter-option-inner-inner">
                                  {getSelectedRole !== null
                                    ? getSelectedRole
                                    : "Choose Category"}
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className="dropdown-menu">
                            <div className="inner show">
                              <ul className="dropdown-menu inner show">
                                {role.map((item, index) => (
                                  <li
                                    onClick={() => roleHandler(item)}
                                    key={index}
                                    className="selected active"
                                  >
                                    <a
                                      className={`dropdown-item selected ${
                                        getSelectedRole === item ? "active" : ""
                                      }`}
                                    >
                                      <span className="text">{item}</span>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3 col-lg-2 col-xl-3">
                      <div className="text-center text-xl-start">
                        <button
                          onClick={searchHandler}
                          className="ud-btn btn-thm w-100 bdrs60"
                          type="button"
                        >
                          Search
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row mt20 animate-up-4">
                  <div className="col-xl-9">
                    <div className="row justify-content-between">
                      <div className="col-6 col-sm-3 funfact_one at-home2-hero">
                        <div className="details">
                          <ul className="ps-0 mb-0 d-flex">
                            <li>
                              <div className="timer">
                                <CountUp end={834} duration={2.75} />
                              </div>
                            </li>
                            <li>
                              <span>M</span>
                            </li>
                          </ul>
                          <p className="text-white mb-0">Total Freelancer</p>
                        </div>
                      </div>
                      <div className="col-6 col-sm-3 funfact_one at-home2-hero">
                        <div className="details">
                          <ul className="ps-0 mb-0 d-flex">
                            <li>
                              <div className="timer">
                                <CountUp end={732} duration={2.75} />
                              </div>
                            </li>
                            <li>
                              <span>M</span>
                            </li>
                          </ul>
                          <p className="text-white mb-0">Positive Review</p>
                        </div>
                      </div>
                      <div className="col-6 col-sm-3 funfact_one at-home2-hero">
                        <div className="details">
                          <ul className="ps-0 mb-0 d-flex">
                            <li>
                              <div className="timer">
                                <CountUp end={90} duration={2.75} />
                              </div>
                            </li>
                            <li>
                              <span>M</span>
                            </li>
                          </ul>
                          <p className="text-white mb-0">Order recieved</p>
                        </div>
                      </div>
                      <div className="col-6 col-sm-3 funfact_one at-home2-hero pe-0">
                        <div className="details">
                          <ul className="ps-0 mb-0 d-flex">
                            <li>
                              <div className="timer">
                                <CountUp end={236} duration={2.75} />
                              </div>
                            </li>
                            <li>
                              <span>M</span>
                            </li>
                          </ul>
                          <p className="text-white mb-0">Projects Completed</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-5 d-none d-xl-block position-relative">
              <Image
                height={551}
                width={663}
                style={{ height: "fit-content" }}
                src="/images/about/home-hero.png"
                alt="hero"
                className="animate-up-1 main-img-home2"
              />
              <div className="home2-hero-content position-relative">
                <div className="iconbox-small1 d-none d-xl-flex wow fadeInRight default-box-shadow4 bounce-x animate-up-1">
                  <span className="icon flaticon-video-file" />
                  <div className="details pl20">
                    <h6 className="mb-1">Vetted video talent</h6>
                    <p className="text fz13 mb-0">Real portfolios & reviews</p>
                  </div>
                </div>
                <div className="iconbox-small2 d-none d-xl-flex wow fadeInLeft default-box-shadow4 bounce-y animate-up-2">
                  <span className="icon flaticon-rocket" />
                  <div className="details pl20">
                    <h6 className="mb-1">Fast turnaround</h6>
                    <p className="text fz13 mb-0">Reels, TikToks & Shorts</p>
                  </div>
                </div>
                <div className="bounce-x bdrs16 img-1 default-box-shadow4 bgc-white d-flex align-items-center px25 py10 text-nowrap">
                  <h6 className="mb-0 me-3">10K+ Happy Creators</h6>
                  <Image
                    height={54}
                    width={163}
                    src="/images/about/avatars_163x43 New.png"
                    alt="happy creators"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
