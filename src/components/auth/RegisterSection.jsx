"use client";
import { ACCOUNT_TYPES } from "@/data/talentOptions";
import Link from "next/link";
import { useState } from "react";
import RegisterForm from "./RegisterForm";

// Register page body: the account-type choice under the title drives the form below.
export default function RegisterSection({ initialType = null }) {
  const [accountType, setAccountType] = useState(initialType);

  return (
    <section className="our-register">
      <div className="container">
        <div className="row">
          <div className="col-lg-10 m-auto wow fadeInUp" data-wow-delay="300ms">
            <div className="main-title register-title text-center">
              <h2 className="title">Register</h2>
              <div
                className="checkbox-style1 account-type-choice d-flex flex-wrap justify-content-center column-gap-5"
                role="group"
                aria-label="Account type"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <label key={t.value} className="custom_checkbox mb-0">
                    {t.label}
                    <input
                      type="checkbox"
                      checked={accountType === t.value}
                      // Behaves like a radio: picking one clears the other.
                      onChange={(e) =>
                        setAccountType(e.target.checked ? t.value : null)
                      }
                    />
                    <span className="checkmark" />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="row wow fadeInRight" data-wow-delay="300ms">
          <div className="col-xl-6 mx-auto">
            <div className="log-reg-form search-modal form-style1 bgc-white p50 p30-sm default-box-shadow1 bdrs12">
              <div className="mb30">
                <h4>Let&apos;s create your account!</h4>
                <p className="text mt20">
                  Already have an account?{" "}
                  <Link href="/login" className="text-thm">
                    Log In!
                  </Link>
                </p>
              </div>
              <RegisterForm accountType={accountType} />
              <div className="hr_content mb20">
                <hr />
                <span className="hr_top_text">OR</span>
              </div>
              <div className="d-md-flex justify-content-between">
                <button
                  className="ud-btn btn-fb fz14 fw400 mb-2 mb-md-0"
                  type="button"
                >
                  <i className="fab fa-facebook-f pr10" /> Continue Facebook
                </button>
                <button
                  className="ud-btn btn-google fz14 fw400 mb-2 mb-md-0"
                  type="button"
                >
                  <i className="fab fa-google" /> Continue Google
                </button>
                <button className="ud-btn btn-apple fz14 fw400" type="button">
                  <i className="fab fa-apple" /> Continue Apple
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
