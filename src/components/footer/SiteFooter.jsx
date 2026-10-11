import { footerColumns, footerLegal } from "@/data/footer";
import Link from "next/link";

// The ShortWorks footer: only links to real pages (no newsletter, apps or social
// accounts yet). `className` is the template's section style for where it sits.
export default function SiteFooter({ className = "footer-style1 pt25 pb-0" }) {
  return (
    <section className={className}>
      <div className="container">
        <div className="row bb-white-light pb10 mb60">
          <div className="col-12">
            <div className="d-block text-center text-md-start d-md-flex align-items-center mb-3 mb-md-0">
              {footerLegal.map((item) => (
                <Link key={item.path} className="fz17 fw500 mr15-md mr30 text-white" href={item.path}>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="row">
          {footerColumns.map((col) => (
            <div key={col.title} className="col-sm-6 col-lg-4">
              <div className="link-style1 mb-4 mb-sm-5">
                <h5 className="text-white mb15">{col.title}</h5>
                <ul className="ps-0">
                  {col.links.map((item) => (
                    <li key={item.name}>
                      <Link href={item.path}>{item.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="container white-bdrt1 py-4">
        <p className="copyright-text mb-0 text-white-light ff-heading text-center text-lg-start">
          © ShortWorks {new Date().getFullYear()}. All rights reserved.
        </p>
      </div>
    </section>
  );
}
