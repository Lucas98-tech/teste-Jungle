import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  ArrowUpRight,
  Menu,
  Wallet,
  UserRound,
  LogOut,
  Leaf,
  Home,
  Heart,
  Grid2X2,
} from "lucide-react";
import { useSession } from "../lib/session";
import { api, get, queryClient, message } from "../lib/api";
import type { Quote, Scenario } from "../lib/contracts";
import { scenarios } from "../lib/contracts";
import { Button } from "./ui/button";
import { Dialog, DialogTrigger, DialogContent } from "./ui/dialog";
export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div
      className="skeleton-grid"
      role="status"
      aria-label="Carregando conteúdo"
    >
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="empty">
      <p role="alert">{message(error)}</p>
      <Button onClick={retry}>Tentar novamente</Button>
    </div>
  );
}
export function NotFound() {
  return (
    <section className="container empty">
      <h1>Página não encontrada</h1>
      <Link to="/">Voltar ao catálogo</Link>
    </section>
  );
}
export function Layout() {
  const { user } = useSession(),
    navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("default");
  const cart = useQuery({
    queryKey: ["cart", user?.id || "guest"],
    queryFn: ({ signal }) => get<Quote>("/cart", signal),
  });
  useEffect(() => {
    const handler = (e: Event) => setNotice((e as CustomEvent<string>).detail);
    window.addEventListener("market-notice", handler);
    return () => window.removeEventListener("market-notice", handler);
  }, []);
  async function logout() {
    await api.delete("/session");
    queryClient.removeQueries({
      predicate: (q) => q.queryKey[0] !== "session",
    });
    queryClient.setQueryData(["session"], null);
    await navigate({ to: "/" });
  }
  const links = (
    <>
      <Link to="/" onClick={() => setOpen(false)}>
        Explorar
      </Link>
      <Link to="/profile" onClick={() => setOpen(false)}>
        Meu perfil
      </Link>
      <Link to="/wallets" onClick={() => setOpen(false)}>
        Carteiras
      </Link>
    </>
  );
  return (
    <>
      <a href="#main" className="skip">
        Pular para conteúdo
      </a>
      <div className="announcement">
        Uma nova forma de colecionar arte.{" "}
        <span>Explore o extraordinário ↗</span>
      </div>
      <header className="header container">
        <Link to="/" className="logo">
          <Leaf aria-hidden="true" /> KURIO
        </Link>
        <nav className="desktop" aria-label="Principal">
          {links}
        </nav>
        <div className="header-actions">
          <Link
            to="/cart"
            className="cart-link"
            aria-label={`Carrinho, ${cart.data?.items.reduce((s, i) => s + i.quantity, 0) || 0} itens`}
          >
            <ShoppingBag size={21} />
            <span>
              {cart.data?.items.reduce((s, i) => s + i.quantity, 0) || 0}
            </span>
          </Link>
          {user ? (
            <>
              <Link to="/profile" className="desktop user-link">
                <UserRound size={17} />
                {user.name.split(" ")[0]}
              </Link>
              <button
                className="icon-button"
                aria-label="Sair"
                onClick={() =>
                  void logout().catch((e) => setNotice(message(e)))
                }
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Button asChild className="desktop">
              <Link to="/login" search={{ returnTo: "/profile" }}>
                <Wallet size={16} />
                Entrar
              </Link>
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="mobile icon-button" aria-label="Abrir menu">
                <Menu />
              </button>
            </DialogTrigger>
            <DialogContent
              title="Navegação"
              description="Explore o marketplace e sua conta."
            >
              <nav className="mobile-nav">
                {links}
                {!user && (
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Entrar
                  </Link>
                )}
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      {notice && (
        <div className="notice container" role="status">
          {notice}
          <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <main id="main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Navegação mobile">
        <Link to="/" aria-label="Início">
          <Home size={20} />
        </Link>
        <Link to="/profile" aria-label="Favoritos">
          <Heart size={20} />
        </Link>
        <Link to="/cart" aria-label="Carrinho">
          <ShoppingBag size={20} />
        </Link>
        <Link to="/wallets" aria-label="Carteiras">
          <Grid2X2 size={20} />
        </Link>
        <Link to="/profile" aria-label="Perfil">
          <UserRound size={20} />
        </Link>
      </nav>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Link className="logo" to="/">
              <Leaf />
              KURIO
            </Link>
            <p>
              Arte que conecta.
              <br />
              Coleções que inspiram.
            </p>
          </div>
          <div>
            <h3>Explore seu próximo favorito.</h3>
            <Link to="/">
              Descubra o marketplace <ArrowUpRight size={16} />
            </Link>
            <p className="muted">
              Ambiente de demonstração. Nenhuma transação é real.
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          © {new Date().getFullYear()} Jungle. Arte, em novas dimensões.
          <span>Feito para colecionar possibilidades.</span>
        </div>
      </footer>
      {import.meta.env.VITE_MOCKS !== "false" && (
        <details className="scenario-panel">
          <summary>Cenários da demonstração</summary>
          <label>
            Cenário
            <select
              value={scenario}
              onChange={async (e) => {
                const value = e.target.value as Scenario;
                await api.post("/mock/scenario", { scenario: value });
                setScenario(value);
                void queryClient.invalidateQueries();
              }}
            >
              {scenarios.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            onClick={async () => {
              await api.post("/mock/event", { kind: "price" });
            }}
          >
            Alterar preço via Socket.IO
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await api.post("/mock/event", { kind: "sold-out" });
            }}
          >
            Esgotar edição
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await api.post("/mock/expire");
              queryClient.removeQueries({
                predicate: (q) => q.queryKey[0] !== "session",
              });
              queryClient.setQueryData(["session"], null);
            }}
          >
            Expirar sessão
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await api.post("/mock/reset", { scenario: "default" });
              location.assign("/");
            }}
          >
            Restaurar dados
          </Button>
        </details>
      )}
    </>
  );
}
