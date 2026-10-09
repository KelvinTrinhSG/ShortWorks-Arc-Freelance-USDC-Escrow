import Link from "next/link";

const categories = [
  {
    name: "Short-Form Video Editor",
    icon: "flaticon-sliders",
    path: "/service-4",
  },
  {
    name: "Short-Form Video Animator",
    icon: "flaticon-video-file",
    path: "/service-4",
  },
];

export default function Mega({ staticMenuClass }) {
  return (
    <>
      <div id="mega-menu">
        <a
          className={`btn-mega fw500 ${
            staticMenuClass ? staticMenuClass : ""
          } `}
        >
          <span
            className={`pl30 pl10-xl pr5 fz15 vam flaticon-menu ${
              staticMenuClass ? staticMenuClass : ""
            } `}
          />
          Categories
        </a>
        <ul className="menu ps-0">
          {categories.map((item) => (
            <li key={item.name}>
              <Link href={item.path}>
                <span className={`menu-icn ${item.icon}`} />
                <span className="menu-title">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
