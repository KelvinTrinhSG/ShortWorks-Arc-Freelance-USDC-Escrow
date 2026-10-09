const menus = [
  {
    id: 2,
    name: "Services",
    path: "/service-4",
  },
  {
    id: 6,
    name: "Projects",
    path: "/project-1",
  },
  {
    id: 3,
    name: "Users",
    children: [
      { id: 1, name: "Employer", path: "/employee-1" },
      { id: 2, name: "Freelancer", path: "/freelancer-1" },
    ],
  },
  {
    id: 4,
    name: "Pages",
    children: [
      {
        id: 1,
        name: "About",
        children: [
          { id: 1, name: "About v1", path: "/about-1" },
          { id: 2, name: "About v2", path: "/about-2" },
        ],
      },
      {
        id: 2,
        name: "Blog",
        children: [
          { id: 1, name: "List 1", path: "/blog-1" },
          { id: 2, name: "List 2", path: "/blog-2" },
          { id: 3, name: "List 3", path: "/blog-3" },
          { id: 4, name: "Single", path: "/blog-single" },
        ],
      },
      {
        id: 3,
        name: "Shop",
        children: [
          { id: 1, name: "List", path: "/shop-list" },
          { id: 2, name: "Single", path: "/shop-single" },
          { id: 3, name: "Cart", path: "/shop-cart" },
          { id: 4, name: "Checkout", path: "/shop-checkout" },
          { id: 5, name: "Order", path: "/shop-order" },
        ],
      },
      {
        id: 4,
        name: "Contact",
        path: "/contact",
      },
      {
        id: 5,
        name: "404",
        path: "/not-found",
      },
      {
        id: 6,
        name: "Faq",
        path: "/faq",
      },
      {
        id: 7,
        name: "Help",
        path: "/help",
      },
      {
        id: 8,
        name: "Invoices",
        path: "/invoices",
      },
      {
        id: 9,
        name: "Login",
        path: "/login",
      },
      {
        id: 10,
        name: "Pricing",
        path: "/pricing",
      },
      {
        id: 11,
        name: "Register",
        path: "/register",
      },
      {
        id: 12,
        name: "Terms",
        path: "/terms",
      },
      {
        id: 13,
        name: "UI Elements",
        path: "/ui-elements",
      },
    ],
  },
  {
    id: 5,
    name: "Contact",
    path: "/contact",
  },
];

export default menus;
