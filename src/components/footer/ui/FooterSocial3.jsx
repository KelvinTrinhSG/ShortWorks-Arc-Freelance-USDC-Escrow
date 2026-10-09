import Link from "next/link";

export default function FooterSocial3() {
  return (
    <>
      <div className="social-widget">
        <h5 className="mb20">Follow Us</h5>
        <div className="social-style1 light-style">
          <Link href="/">
            <i className="fab fa-facebook-f list-inline-item"></i>
          </Link>
          <Link href="/">
            <i className="fab fa-twitter list-inline-item"></i>
          </Link>
          <Link href="/">
            <i className="fab fa-instagram list-inline-item"></i>
          </Link>
          <Link href="/">
            <i className="fab fa-linkedin-in list-inline-item"></i>
          </Link>
        </div>
      </div>
    </>
  );
}
