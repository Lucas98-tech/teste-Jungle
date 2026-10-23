import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Trash2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { api, get, message, queryClient } from "../lib/api";
import { useSession } from "../lib/session";
import type { Quote, Wallet, Order } from "../lib/contracts";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Skeleton, ErrorState } from "../components/Layout";
function useCart() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["cart", user?.id || "guest"],
    queryFn: ({ signal }) => get<Quote>("/cart", signal),
  });
}
function Summary({ quote }: { quote: Quote }) {
  return (
    <dl className="summary-values">
      <div>
        <dt>Subtotal</dt>
        <dd>{quote.subtotal} ETH</dd>
      </div>
      <div>
        <dt>Desconto {quote.coupon && `(${quote.coupon})`}</dt>
        <dd>− {quote.discount} ETH</dd>
      </div>
      <div>
        <dt>Taxa de rede simulada</dt>
        <dd>{quote.fee} ETH</dd>
      </div>
      <div className="total">
        <dt>Total</dt>
        <dd>{quote.total} ETH</dd>
      </div>
    </dl>
  );
}
export function Cart() {
  const cart = useCart();
  const [coupon, setCoupon] = useState("");
  const mutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity?: number }) =>
      quantity === undefined
        ? api.delete(`/cart/${id}`)
        : api.patch(`/cart/${id}`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
  const promo = useMutation({
    mutationFn: (code: string) => api.post("/quote", { coupon: code }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
  if (cart.isPending)
    return (
      <section className="container page">
        <Skeleton cards={2} />
      </section>
    );
  if (cart.isError)
    return (
      <section className="container page">
        <ErrorState error={cart.error} retry={() => void cart.refetch()} />
      </section>
    );
  return (
    <section className="container page">
      <div className="breadcrumb">
        <Link to="/">Explorar</Link> / Carrinho
      </div>
      <h1>Seu próximo capítulo.</h1>
      <p className="page-intro">Suas descobertas, reunidas em um só lugar.</p>
      {!cart.data.items.length ? (
        <div className="empty">
          <h2>Seu carrinho está esperando inspiração.</h2>
          <Button asChild>
            <Link to="/">Explorar obras</Link>
          </Button>
        </div>
      ) : (
        <div className="purchase-grid">
          <div>
            {cart.data.items.map((item) => (
              <article className="cart-item" key={item.nftId}>
                <Link to="/nft/$id" params={{ id: item.nftId }}>
                  <img
                    src={item.nft.image}
                    alt={item.nft.name}
                    width="110"
                    height="110"
                  />
                </Link>
                <div>
                  <Link to="/nft/$id" params={{ id: item.nftId }}>
                    <h3>{item.nft.name}</h3>
                  </Link>
                  <p>{item.nft.artist}</p>
                  <small>{item.nft.edition}</small>
                  <label className="quantity-label">
                    Quantidade
                    <input
                      aria-label={`Quantidade de ${item.nft.name}`}
                      type="number"
                      min="1"
                      max={item.nft.stock}
                      value={item.quantity}
                      disabled={mutation.isPending}
                      onChange={(e) =>
                        mutation.mutate({
                          id: item.nftId,
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  {item.quantity > item.nft.stock && (
                    <p role="alert">
                      Edição indisponível. Remova para continuar.
                    </p>
                  )}
                </div>
                <div className="cart-item-end">
                  <strong>{item.nft.price} ETH</strong>
                  <button
                    className="icon-button"
                    aria-label={`Remover ${item.nft.name}`}
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: item.nftId })}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
            {mutation.isError && <p role="alert">{message(mutation.error)}</p>}
            <Link className="text-link" to="/">
              ← Continuar explorando
            </Link>
          </div>
          <aside className="summary">
            <h2>Resumo da coleção</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                promo.mutate(coupon);
              }}
            >
              <label htmlFor="coupon">Cupom de desconto</label>
              <div className="input-action">
                <input
                  id="coupon"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Seu código"
                />
                <Button variant="outline" disabled={promo.isPending}>
                  Aplicar
                </Button>
              </div>
            </form>
            {cart.data.coupon && (
              <button
                className="text-link"
                disabled={promo.isPending}
                onClick={() => promo.mutate("")}
              >
                Remover cupom
              </button>
            )}
            {promo.isError && <p role="alert">{message(promo.error)}</p>}
            <Summary quote={cart.data} />
            <Button asChild>
              <Link to="/checkout">
                Continuar para pagamento
                <ArrowRight size={17} />
              </Link>
            </Button>
            <p className="security">
              <ShieldCheck size={15} />
              Compra 100% simulada
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
export function Checkout() {
  const { user } = useSession();
  const navigate = useNavigate();
  const cart = useCart();
  const wallets = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: ({ signal }) => get<Wallet[]>("/wallets", signal),
    enabled: !!user,
  });
  const [walletId, setWalletId] = useState(""),
    [network, setNetwork] = useState("Ethereum"),
    [connected, setConnected] = useState(false),
    [connectionError, setConnectionError] = useState(""),
    [review, setReview] = useState<Quote | null>(null),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const [marketNotice, setMarketNotice] = useState("");
  useEffect(() => {
    const listener = (event: Event) =>
      setMarketNotice((event as CustomEvent<string>).detail);
    window.addEventListener("market-notice", listener);
    return () => window.removeEventListener("market-notice", listener);
  }, []);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const saved = sessionStorage.getItem("jungle.pending");
    if (saved) {
      try {
        const pending = JSON.parse(saved);
        if (pending.userId === user?.id) void submit(pending);
      } catch {
        sessionStorage.removeItem("jungle.pending");
      }
    }
  }, [user?.id]);
  useEffect(() => {
    if (user === null)
      void navigate({ to: "/login", search: { returnTo: "/checkout" } });
  }, [user]);
  async function submit(pending: {
    key: string;
    userId: string;
    body: { fingerprint: string; walletId: string; network: string };
  }) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<Order>("/orders", pending.body, {
        headers: { "Idempotency-Key": pending.key },
      });
      sessionStorage.removeItem("jungle.pending");
      await navigate({ to: "/orders/$id", params: { id: data.id } });
    } catch (e) {
      setError(message(e));
      if ((e as { response?: { status: number } }).response?.status === 409) {
        sessionStorage.removeItem("jungle.pending");
        setReview(null);
        setOpen(false);
        void queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function prepare(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!connected)
        throw new Error("Conecte a carteira simulada para continuar.");
      const { data } = await api.post<Quote>(
        "/quote",
        {},
        { headers: { "X-Require-Session": "true" } },
      );
      setReview(data);
      setOpen(true);
    } catch (e) {
      setError(message(e));
    }
  }
  async function buy() {
    if (!user || !review) return;
    try {
      const { data } = await api.post<Quote>(
        "/quote",
        {},
        { headers: { "X-Require-Session": "true" } },
      );
      if (data.fingerprint !== review.fingerprint) {
        setReview(data);
        setError(
          "Os valores mudaram. Revise a nova cotação e confirme novamente.",
        );
        return;
      }
      const stored = sessionStorage.getItem("jungle.pending");
      const pending = stored
        ? JSON.parse(stored)
        : {
            key: crypto.randomUUID(),
            userId: user.id,
            body: { fingerprint: review.fingerprint, walletId, network },
          };
      sessionStorage.setItem("jungle.pending", JSON.stringify(pending));
      await submit(pending);
    } catch (e) {
      setError(message(e));
    }
  }
  if (cart.isPending || wallets.isPending)
    return (
      <section className="container page">
        <Skeleton cards={2} />
      </section>
    );
  if (cart.isError || wallets.isError)
    return (
      <section className="container page">
        <ErrorState
          error={cart.error || wallets.error}
          retry={() => {
            void cart.refetch();
            void wallets.refetch();
          }}
        />
      </section>
    );
  if (!cart.data.items.length && sessionStorage.getItem("jungle.pending"))
    return (
      <section className="container page empty">
        <h1>Recuperando sua compra.</h1>
        <p role="status">
          {busy
            ? "Aguardando resposta da tentativa original…"
            : "Consulte sua tentativa original sem criar outra compra."}
        </p>
        {error && <p role="alert">{error}</p>}
        <Button
          disabled={busy}
          onClick={() =>
            void submit(JSON.parse(sessionStorage.getItem("jungle.pending")!))
          }
        >
          Recuperar pedido
        </Button>
      </section>
    );
  if (!cart.data.items.length)
    return (
      <section className="container page empty">
        <h1>Seu carrinho está vazio</h1>
        <Link to="/">Explore as obras</Link>
      </section>
    );
  return (
    <section className="container page">
      <div className="breadcrumb">
        <Link to="/cart">Carrinho</Link> / Pagamento
      </div>
      <h1>Quase na sua coleção.</h1>
      <p className="page-intro">Revise os detalhes. O próximo passo é seu.</p>
      <div className="purchase-grid">
        <form className="form-card" onSubmit={prepare}>
          <h2>01. Dados do colecionador</h2>
          <label>
            Nome completo
            <input
              name="name"
              autoComplete="name"
              required
              defaultValue={user?.name}
            />
          </label>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={user?.email}
            />
          </label>
          <h2>02. Sua carteira</h2>
          {!wallets.data?.length && (
            <p>
              Cadastre uma carteira em <Link to="/wallets">Carteiras</Link>.
            </p>
          )}
          <label>
            Carteira
            <select
              aria-label="Carteira"
              required
              value={walletId}
              onChange={(e) => {
                setWalletId(e.target.value);
                setConnected(false);
              }}
            >
              <option value="">Selecione uma carteira</option>
              {wallets.data?.map((w) => (
                <option value={w.id} key={w.id}>
                  {w.name} · {w.address.slice(0, 8)}…
                </option>
              ))}
            </select>
          </label>
          <label>
            Rede
            <select
              aria-label="Rede"
              value={network}
              onChange={(e) => {
                setNetwork(e.target.value);
                setConnected(false);
              }}
            >
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </label>
          <div className="connection-actions">
            <Button
              type="button"
              variant="outline"
              disabled={!walletId}
              onClick={() => {
                const wallet = wallets.data?.find((w) => w.id === walletId);
                if (wallet?.network !== network) {
                  setConnectionError("Rede incompatível com a carteira.");
                  return;
                }
                setConnected(!connected);
                setConnectionError("");
              }}
            >
              {connected ? "Desconectar carteira" : "Simular conexão"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setConnected(false);
                setConnectionError("Conexão recusada pelo colecionador.");
              }}
            >
              Simular recusa
            </Button>
          </div>
          {connectionError && <p role="alert">{connectionError}</p>}
          <p role="status">
            {connected
              ? "Carteira conectada (simulação)"
              : "Carteira desconectada"}
          </p>
          <label className="checkbox-label">
            <input type="checkbox" required />
            Entendo que esta é uma compra fictícia, sem valores reais.
          </label>
          <Button id="review-button" disabled={!connected || busy}>
            Revisar pedido
            <ArrowRight size={16} />
          </Button>
          {error && !open && <p role="alert">{error}</p>}
        </form>
        <aside className="summary">
          <h2>Sua coleção</h2>
          {cart.data.items.map((i) => (
            <div className="mini-item" key={i.nftId}>
              <img src={i.nft.image} alt="" width="48" height="48" />
              <span>
                {i.nft.name}
                <small>{i.quantity} edição(ões)</small>
              </span>
            </div>
          ))}
          <Summary quote={cart.data} />
          <p className="security">
            Os valores serão revalidados antes da compra.
          </p>
        </aside>
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById("review-button")?.focus();
          }}
          title="Revise seu pedido"
          description="Confirme os itens e valores da sua compra simulada."
        >
          {marketNotice && <p role="status">{marketNotice}</p>}
          {review && (
            <>
              <ul>
                {review.items.map((i) => (
                  <li key={i.nftId}>
                    {i.quantity} × {i.nft.name}
                  </li>
                ))}
              </ul>
              <Summary quote={review} />
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <Button disabled={busy} onClick={() => void buy()}>
            {busy
              ? "Enviando…"
              : sessionStorage.getItem("jungle.pending")
                ? "Recuperar tentativa"
                : "Confirmar compra simulada"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function Receipt() {
  const { id } = useParams({ from: "/orders/$id" });
  const { user } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (user === null)
      void navigate({ to: "/login", search: { returnTo: `/orders/${id}` } });
  }, [user, id]);
  const order = useQuery({
    queryKey: ["order", user?.id, id],
    queryFn: ({ signal }) => get<Order>(`/orders/${id}`, signal),
    enabled: !!user,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  if (order.isPending)
    return (
      <section className="container page">
        <Skeleton cards={1} />
      </section>
    );
  if (order.isError)
    return (
      <section className="container page">
        <ErrorState error={order.error} retry={() => void order.refetch()} />
      </section>
    );
  const o = order.data;
  return (
    <section className="container page receipt">
      <div className={`receipt-icon ${o.status}`}>
        {o.status === "confirmed" ? (
          <CheckCircle2 size={45} />
        ) : o.status === "pending" ? (
          <Clock size={45} />
        ) : (
          <XCircle size={45} />
        )}
      </div>
      <p className="eyebrow">
        {o.status === "confirmed"
          ? "BEM-VINDO À SUA NOVA COLEÇÃO"
          : "ACOMPANHE SUA COMPRA"}
      </p>
      <h1>
        {o.status === "confirmed"
          ? "A arte agora faz parte de você."
          : o.status === "pending"
            ? "Sua compra está em processamento."
            : "Pagamento recusado."}
      </h1>
      <p role="status">
        {o.status === "confirmed"
          ? "Pedido confirmado na simulação."
          : o.status === "pending"
            ? "Você pode recarregar esta página. Seu pedido será recuperado."
            : "Os itens permanecem no seu carrinho. Nenhuma cobrança foi realizada."}
      </p>
      <div className="receipt-paper">
        <h2>
          {o.status === "confirmed"
            ? "Recibo do pedido"
            : "Detalhes da tentativa"}
        </h2>
        <p className="break">Pedido: {o.id}</p>
        {o.quote.items.map((i) => (
          <div className="mini-item" key={i.nftId}>
            <img src={i.nft.image} alt={i.nft.name} width="64" height="64" />
            <span>
              {i.nft.name}
              <small>
                {i.quantity} × {i.nft.price} ETH
              </small>
            </span>
          </div>
        ))}
        <Summary quote={o.quote} />
        {o.status === "confirmed" && (
          <p className="break">
            Transação simulada: {o.transaction}
            <br />
            <small>Referência fictícia, sem explorador blockchain.</small>
          </p>
        )}
      </div>
      <Button asChild>
        <Link to={o.status === "declined" ? "/cart" : "/"}>
          {o.status === "declined"
            ? "Voltar ao carrinho"
            : "Continuar explorando"}
        </Link>
      </Button>
    </section>
  );
}
