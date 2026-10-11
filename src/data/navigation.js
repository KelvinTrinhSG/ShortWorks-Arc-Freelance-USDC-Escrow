const menus = [
  {
    id: 2,
    name: "Services",
    path: "/services",
  },
  {
    id: 6,
    name: "Projects",
    path: "/projects",
  },
  {
    id: 5,
    name: "Jobs",
    path: "/jobs",
  },
  // `showFor`: only shown to logged-in accounts of that type.
  {
    id: 3,
    name: "Find Employer",
    path: "/employers",
    showFor: "freelancer",
  },
  {
    id: 7,
    name: "Find Freelancer",
    path: "/freelancers",
    showFor: "client",
  },
  {
    id: 4,
    name: "Pages",
    hidden: true,
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
  // Contact lives in the footer (data/footer.js).
];

// Menu items the given user (or guest, when null) should see.
export const visibleMenus = (user) =>
  menus.filter(
    (item) => !item.hidden && (!item.showFor || item.showFor === user?.accountType),
  );

export default menus;
