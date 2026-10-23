import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { get } from "./lib/api";
import type { User } from "./lib/contracts";
import { Layout, NotFound } from "./components/Layout";
import { Catalog, Detail } from "./pages/Catalog";
import { Cart, Checkout, Receipt } from "./pages/Purchase";
import { Auth, Profile, Wallets } from "./pages/Account";
const root = createRootRoute({
  component: Layout,
  notFoundComponent: NotFound,
});
const protect = async ({ location }: { location: { href: string } }) => {
  const user = await get<User | null>("/session");
  if (!user)
    throw redirect({ to: "/login", search: { returnTo: location.href } });
};
const home = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch: (
    s: SearchSchemaInput & {
      q?: string;
      category?: string;
      sort?: string;
      page?: number;
      available?: boolean | string;
    },
  ) => ({
    q: String(s.q || ""),
    category: String(s.category || ""),
    sort: ["low", "high"].includes(String(s.sort))
      ? String(s.sort)
      : "featured",
    page: Math.max(1, Number(s.page) || 1),
    available: s.available === "true" || s.available === true,
  }),
  component: Catalog,
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/nft/$id",
  component: Detail,
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/cart",
  component: Cart,
});
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/checkout",
  beforeLoad: protect,
  component: Checkout,
});
const order = createRoute({
  getParentRoute: () => root,
  path: "/orders/$id",
  beforeLoad: protect,
  component: Receipt,
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: (s: SearchSchemaInput & { returnTo?: string }) => ({
    returnTo:
      typeof s.returnTo === "string" &&
      s.returnTo.startsWith("/") &&
      !s.returnTo.startsWith("//")
        ? s.returnTo
        : "/checkout",
  }),
  component: () => <Auth />,
});
const register = createRoute({
  getParentRoute: () => root,
  path: "/register",
  validateSearch: (s: SearchSchemaInput & { returnTo?: string }) => ({
    returnTo:
      typeof s.returnTo === "string" &&
      s.returnTo.startsWith("/") &&
      !s.returnTo.startsWith("//")
        ? s.returnTo
        : "/checkout",
  }),
  component: () => <Auth register />,
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/profile",
  beforeLoad: protect,
  component: Profile,
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/wallets",
  beforeLoad: protect,
  component: Wallets,
});
export const router = createRouter({
  routeTree: root.addChildren([
    home,
    detail,
    cart,
    checkout,
    order,
    login,
    register,
    profile,
    wallets,
  ]),
  defaultPendingComponent: () => <p role="status">Carregando…</p>,
  defaultErrorComponent: ({ error, reset }) => (
    <section className="container empty">
      <h1>Não foi possível abrir esta página</h1>
      <p role="alert">
        {error instanceof Error ? error.message : "Falha de conexão."}
      </p>
      <button onClick={reset}>Tentar novamente</button>
    </section>
  ),
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
