"use client";
import Link from "next/link";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Mega from "./Mega";
import Navigation from "./Navigation";
import MobileNavigation2 from "./MobileNavigation2";
import HeaderAuthLinks from "./HeaderAuthLinks";

export default function Header20() {
    const path = usePathname();
    return (
        <>
            <header className="header-nav nav-innerpage-style main-menu  ">
                <nav className="posr">
                    <div className="container-fluid posr menu_bdrt1">
                        <div className="row align-items-center justify-content-between">
                            <div className="col-auto pe-0">
                                <div className="d-flex align-items-center">
                                    <Link
                                        className="header-logo bdrr1 pr30 pr5-xl"
                                        href="/"
                                    >
                                        <Image
                                            height={40}
                                            width={180}
                                            className="w-100 h-100 object-fit-contain"
                                            src="/images/header-logo-dark.svg"
                                            alt="Header Logo"
                                        />
                                    </Link>
                                    <div className="home1_style">
                                        <Mega />
                                    </div>
                                </div>
                            </div>
                            <div className="col-auto">
                                <div className="d-flex align-items-center">
                                    <Navigation />
                                    <a
                                        className="login-info bdrl1 pl15-lg pl30"
                                        data-bs-toggle="modal"
                                        href="#exampleModalToggle"
                                    >
                                        <span className="flaticon-loupe" />
                                    </a>
                                    <Link
                                        className={`login-info mx15-lg mx30 ${
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
                                        signInClassName="login-info mr15-lg mr30"
                                        joinClassName="ud-btn btn-thm add-joining"
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
