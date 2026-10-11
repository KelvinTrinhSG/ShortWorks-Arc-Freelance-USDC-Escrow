import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import Link from "next/link";

export const metadata = {
  title: "ShortWorks - Privacy Policy",
};

// What ShortWorks actually stores and shares, matching the code (lib/profile.js,
// lib/talents.js, lib/payments.js). Draft wording: have it reviewed before going live.
const SECTIONS = [
  {
    id: "collect",
    title: "What we collect",
    body: [
      "Account: your name, username, email and password. The password is stored only as a one-way hash; nobody at ShortWorks can read it.",
      "Profile (if you fill it in): photo, headline, bio, roles, country, time zone, languages, platforms, niches, tools, prices, delivery times, portfolio video links and an optional phone number.",
      "Work on ShortWorks: projects, proposals, services, invitations, job deliveries (links and notes), change requests, disputes and notifications.",
      "Payments: for freelancers, the PayPal merchant ID and connection status PayPal gives us; for every job, the amounts, fees and PayPal reference numbers. Card and bank details are entered on PayPal and never reach ShortWorks.",
      "A login cookie that keeps you signed in. We don't use advertising or tracking cookies.",
    ],
  },
  {
    id: "visible",
    title: "Who can see what",
    body: [
      "Your public profile (name, photo, headline, bio, skills, prices and portfolio) can be seen by anyone. Your email, phone number and PayPal details are never shown on it.",
      "Open projects and active services are public. Proposals are seen by the project owner and the freelancer who sent them.",
      "A job page (brief, deliveries, notes, payment) is seen only by the client and the freelancer on that job, and by the ShortWorks team when a dispute is opened.",
    ],
  },
  {
    id: "share",
    title: "Who we share it with",
    body: [
      "PayPal, to hold, take or release payments and to connect freelancers' accounts. PayPal handles that data under its own privacy policy.",
      "Our hosting providers (the website and the database), only to run the service.",
      "We don't sell your data and don't share it with advertisers.",
    ],
  },
  {
    id: "delete",
    title: "Deleting your data",
    body: [
      "You can edit your profile at any time and close your account from My Profile. Closing it deletes your profile, portfolio and the projects, proposals and services you created.",
      "An account with jobs that were paid (or with money still held) can't be closed from the site, because the payment records must be kept. Contact us and we'll help.",
    ],
  },
];

export default function page() {
  return (
    <>
      <Header20 />
      <section className="our-terms pt50 pb90">
        <div className="container">
          <div className="main-title">
            <h2>Privacy Policy</h2>
            <p className="text">What ShortWorks stores about you, who sees it and how to remove it.</p>
          </div>
          <div className="row">
            <div className="col-md-3 mb30">
              <nav className="position-sticky" style={{ top: 100 }}>
                <ul className="list-unstyled mb-0">
                  {SECTIONS.map((s) => (
                    <li key={s.id} className="mb10">
                      <a href={`#${s.id}`} className="dark-color">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="col-md-9">
              {SECTIONS.map((s, i) => (
                <div key={s.id} id={s.id} className="mb40" style={{ scrollMarginTop: 100 }}>
                  <h4 className="mb15">
                    {i + 1}. {s.title}
                  </h4>
                  <ul className="ps-3 mb-0">
                    {s.body.map((line) => (
                      <li key={line} className="text mb10">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text">
                Questions? <Link href="/contact" className="text-thm">Contact us</Link>. See also the{" "}
                <Link href="/terms" className="text-thm">Terms of Service</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
