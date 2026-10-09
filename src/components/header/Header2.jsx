"use client";
import Link from "next/link";
import Mega from "./Mega";
import MobileNavigation2 from "./MobileNavigation2";
import HeaderAuthLinks from "./HeaderAuthLinks";
import Navigation from "./Navigation";
import Image from "next/image";
import { usePathname } from "next/navigation";
import useStickyMenu from "@/hook/useStickyMenu";

// `inner` renders the same layout on a solid white bar for pages without a dark hero.
export default function Header2({ inner = false }) {
    const sticky = useStickyMenu(50);
    const path = usePathname();

    const headerClassName = inner
        ? "header-nav nav-innerpage-style main-menu"
        : `header-nav nav-homepage-style stricky main-menu border-0 slideIn animated  ${
              sticky ? "slideInDown stricky-fixed" : "slideIn"
          }`;

    return (
        <>
            <header className={headerClassName}>
                <nav className="posr">
                    <div className="container posr">
                        <div className="row align-items-center justify-content-between">
                            <div className="col-auto px-0 px-xl-3">
                                <div className="d-flex align-items-center justify-content-between">
                                    {inner ? (
                                        <Link className="header-logo" href="/">
                                            <Image
                                                height={40}
                                                width={180}
                                                className="w-100 h-100 object-fit-contain"
                                                src="/images/header-logo-dark.svg"
                                                alt="Header Logo"
                                            />
                                        </Link>
                                    ) : (
                                        <div className="logos">
                                            <Link
                                                className="header-logo logo1"
                                                href="/"
                                            >
                                                <Image
                                                    height={40}
                                                    width={180}
                                                    src="/images/header-logo.svg"
                                                    alt="Header Logo"
                                                />
                                            </Link>
                                            <Link
                                                className="header-logo logo2"
                                                href="/"
                                            >
                                                <Image
                                                    height={40}
                                                    width={180}
                                                    src="/images/header-logo2.svg"
                                                    alt="Header Logo"
                                                />
                                            </Link>
                                        </div>
                                    )}
                                    <div className="home1_style at-home2">
                                        <Mega />
                                    </div>
                                    <Navigation />
                                </div>
                            </div>
                            <div className="col-auto pe-0 pe-xl-3">
                                <div className="d-flex align-items-center">
                                    <a
                                        className="login-info"
                                        data-bs-toggle="modal"
                                        href="#exampleModalToggle"
                                    >
                                        <span className="flaticon-loupe" />
                                    </a>
                                    <Link
                                        className={`login-info mx15-xl mx30 ${
                                            path === "/become-seller"
                                                ? "ui-active"
                                                : ""
                                        }`}
                                        href="/become-seller"
                                    >
                                        <span className="d-none d-xl-inline-block">
                                            Become a
                                        </span>{" "}
                                        Seller
                                    </Link>
                                    <HeaderAuthLinks
                                        signInClassName="login-info mr15-xl mr30"
                                        joinClassName={
                                            inner || sticky
                                                ? "ud-btn btn-thm add-joining bdrs50"
                                                : "ud-btn btn-white add-joining bdrs50 text-thm2"
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </header>
            <MobileNavigation2 />
        </>
    );
}
