import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearch,
  useParams,
} from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Search,
  Heart,
  ArrowRight,
  SlidersHorizontal,
  Check,
  ShieldCheck,
} from "lucide-react";
import { api, get, queryClient, message } from "../lib/api";
import { useSession } from "../lib/session";
import type { NFT } from "../lib/contracts";
import { Button } from "../components/ui/button";
import { Skeleton, ErrorState } from "../components/Layout";
function Favorite({ id }: { id: string }) {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const key = ["favorites", user?.id];
  const favorites = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => get<string[]>("/favorites", signal),
    enabled: !!user,
  });
  const mutation = useMutation({
    mutationFn: (active: boolean) =>
      active
        ? api.delete(`/favorites/${id}`)
        : api.post(`/favorites/${id}`, {}),
    onMutate: async (active) => {
      setError("");
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData(
        key,
        active
          ? (previous || []).filter((n) => n !== id)
          : [...(previous || []), id],
      );
      return { previous };
    },
    onError: (e, _, context) => {
      queryClient.setQueryData(key, context?.previous);
      setError(message(e));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const active = favorites.data?.includes(id) || false;
  return (
    <div className="favorite-wrap">
      <button
        className={`favorite ${active ? "active" : ""}`}
        aria-label={
          active ? "Remover dos favoritos" : "Adicionar aos favoritos"
        }
        aria-pressed={active}
        disabled={mutation.isPending || loading}
        onClick={() => {
          if (!user) {
            void navigate({ to: "/login", search: { returnTo: `/nft/${id}` } });
            return;
          }
          mutation.mutate(active);
        }}
      >
        <Heart size={17} fill={active ? "currentColor" : "none"} />
      </button>
      {error && (
        <span className="inline-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
function Card({ nft }: { nft: NFT }) {
  return (
    <article className="nft-card">
      <div className="card-art">
        <Link
          to="/nft/$id"
          params={{ id: nft.id }}
          aria-label={`Ver ${nft.name}`}
        >
          <img
            src={nft.image}
            alt={`Arte digital ${nft.name}`}
            loading="lazy"
            width="500"
            height="500"
          />
        </Link>
        <span className="art-tag">{nft.category}</span>
        <Favorite id={nft.id} />
      </div>
      <div className="card-body">
        <div className="artist">
          <span className={`avatar avatar-${Number(nft.id) % 4}`}>
            {nft.artist[0]}
          </span>
          {nft.artist}
          <Check size={11} />
        </div>
        <Link to="/nft/$id" params={{ id: nft.id }}>
          <h3>{nft.name}</h3>
        </Link>
        <div className="card-price">
          <div>
            <span className="muted">Preço atual</span>
            <strong>
              {nft.price} <small>ETH</small>
            </strong>
          </div>
          <span className="stock">
            {nft.stock ? `${nft.stock} disponíveis` : "Esgotado"}
          </span>
        </div>
      </div>
    </article>
  );
}
export function Catalog() {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["nfts", search],
    queryFn: ({ signal }) =>
      get<{ items: NFT[]; total: number }>(
        `/nfts?${new URLSearchParams({ ...search, page: String(search.page), available: search.available ? "true" : "" })}`,
        signal,
      ),
  });
  const change = (value: Partial<typeof search>) =>
    void navigate({
      to: "/",
      search: { ...search, ...value, page: value.page || 1 },
    });
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            Explore coleções
          </p>
          <h1>
            SEJA DONO DA
            <br />
            <em>CULTURA DIGITAL.</em>
          </h1>
          <p>
            Descubra NFTs selecionados. Deixe sua marca no universo da arte
            digital.
          </p>
          <Button asChild>
            <a href="#catalogo">
              Explorar NFTs <ArrowUpRight size={18} />
            </a>
          </Button>
          <div className="hero-stats">
            <div>
              <strong>4</strong>
              <small>Obras únicas</small>
            </div>
            <div>
              <strong>4</strong>
              <small>Artistas criativos</small>
            </div>
            <div>
              <strong>∞</strong>
              <small>Possibilidades</small>
            </div>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/art/emerald-ape.jpg"
            alt="Emerald Ape com jaqueta verde, óculos de sol e pingente de esmeralda"
            width="640"
            height="560"
            fetchPriority="high"
          />
          <div className="hero-art-label">
            <span>EM DESTAQUE</span>
            <strong>
              Emerald Ape #042 <ArrowUpRight />
            </strong>
            <small>Edição limitada · Kurio Apes</small>
          </div>
          <div className="floating-tag">✦ Coleção em destaque</div>
        </div>
      </section>
      <div className="ticker" aria-hidden="true">
        <span>ARTE DIGITAL</span>✳<span>NOVAS PERSPECTIVAS</span>✳
        <span>CRIATIVIDADE SEM LIMITES</span>✳<span>JUNGLE MARKETPLACE</span>✳
      </div>
      <section className="container catalog" id="catalogo">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE. DESCUBRA. COLECIONE.</p>
            <h2>Encontre sua próxima conexão.</h2>
          </div>
          <span className="muted">
            {query.data?.total ?? "…"} obras para descobrir
          </span>
        </div>
        <div className="catalog-toolbar">
          <label className="search-box">
            <Search size={19} />
            <span className="sr-only">Buscar NFTs</span>
            <input
              placeholder="Busque algo que inspire você…"
              value={search.q}
              onChange={(e) => change({ q: e.target.value })}
            />
          </label>
          <label className="sort-label">
            Ordenar por
            <select
              value={search.sort}
              onChange={(e) => change({ sort: e.target.value })}
            >
              <option value="featured">Destaques</option>
              <option value="low">Menor preço</option>
              <option value="high">Maior preço</option>
            </select>
          </label>
        </div>
        <div className="filter-row">
          <SlidersHorizontal size={17} />
          <button
            className={!search.category ? "filter active" : "filter"}
            onClick={() => change({ category: "" })}
          >
            Todas as obras
          </button>
          {["Arte", "Fotografia", "3D", "Ilustração"].map((category) => (
            <button
              key={category}
              className={`filter ${search.category.split(",").includes(category) ? "active" : ""}`}
              aria-pressed={search.category.split(",").includes(category)}
              onClick={() => {
                const active = search.category.split(",").filter(Boolean);
                change({
                  category: (active.includes(category)
                    ? active.filter((c) => c !== category)
                    : [...active, category]
                  ).join(","),
                });
              }}
            >
              {category}
            </button>
          ))}
          <label className="available-filter">
            <input
              type="checkbox"
              checked={search.available}
              onChange={(e) => change({ available: e.target.checked })}
            />
            Disponíveis
          </label>
        </div>
        {query.isPending ? (
          <Skeleton cards={4} />
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.data.items.length ? (
          <>
            <div className="nft-grid" aria-busy={query.isFetching}>
              {query.data.items.map((nft) => (
                <Card key={nft.id} nft={nft} />
              ))}
            </div>
            <nav className="pagination" aria-label="Páginas do catálogo">
              <Button
                variant="outline"
                disabled={search.page <= 1}
                onClick={() => change({ page: search.page - 1 })}
              >
                Anterior
              </Button>
              <span>
                Página {search.page} de{" "}
                {Math.max(1, Math.ceil(query.data.total / 8))}
              </span>
              <Button
                variant="outline"
                disabled={search.page * 8 >= query.data.total}
                onClick={() => change({ page: search.page + 1 })}
              >
                Próxima <ArrowRight size={16} />
              </Button>
            </nav>
          </>
        ) : (
          <div className="empty">
            <h3>Nenhuma obra encontrada</h3>
            <p>Experimente outra busca ou ajuste os filtros.</p>
            <Button
              onClick={() => change({ q: "", category: "", available: false })}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </section>
      <section className="community container">
        <div>
          <p className="eyebrow">SUA COLEÇÃO COMEÇA COM UMA DESCOBERTA</p>
          <h2>
            Mais que arte.
            <br />
            Uma nova perspectiva.
          </h2>
          <p>Encontre algo que faça sentido para você.</p>
        </div>
        <a
          href="#catalogo"
          className="circle-link"
          aria-label="Voltar ao catálogo"
        >
          <ArrowUpRight size={42} />
        </a>
      </section>
    </>
  );
}
export function Detail() {
  const { id } = useParams({ from: "/nft/$id" });
  const { user } = useSession();
  const [quantity, setQuantity] = useState(1),
    [notice, setNotice] = useState("");
  const nft = useQuery({
    queryKey: ["nft", id],
    queryFn: ({ signal }) => get<NFT>(`/nfts/${id}`, signal),
  });
  const mutation = useMutation({
    mutationFn: () => api.post("/cart", { nftId: id, quantity }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      setNotice("NFT adicionado ao carrinho.");
    },
  });
  if (nft.isPending)
    return (
      <section className="container page">
        <div className="breadcrumb">Explorar / Carregando…</div>
        <div
          className="detail-grid detail-loading"
          role="status"
          aria-label="Carregando conteúdo"
        >
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </section>
    );
  if (nft.isError)
    return (
      <section className="container page">
        <ErrorState error={nft.error} retry={() => void nft.refetch()} />
      </section>
    );
  const n = nft.data;
  return (
    <section className="container page">
      <div className="breadcrumb">
        <Link to="/">Explorar</Link> / {n.name}
      </div>
      <div className="detail-grid">
        <div>
          <img
            className="detail-art"
            src={n.image}
            alt={`Arte digital ${n.name}`}
            width="700"
            height="700"
          />
          <div className="thumbnails">
            <img src={n.image} alt="Obra completa" width="80" height="80" />
          </div>
        </div>
        <div className="detail-info">
          <div className="detail-category">
            {n.category}
            <Favorite id={n.id} />
          </div>
          <h1>{n.name}</h1>
          <p className="artist">
            Criado por <strong>{n.artist}</strong>
            <Check size={14} />
          </p>
          <p className="description">
            Uma exploração de formas, cores e novas possibilidades. Uma obra
            digital para dar uma nova dimensão à sua coleção.
          </p>
          <div className="price-block">
            <span>Preço por edição</span>
            <strong>{n.price} ETH</strong>
            <small>{n.stock} edições disponíveis</small>
          </div>
          <label>
            Edição
            <select aria-label="Edição">
              <option>{n.edition}</option>
              <option disabled>Edição original — indisponível</option>
            </select>
          </label>
          <label>
            Quantidade
            <input
              type="number"
              min="1"
              max={n.stock}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <Button
            disabled={
              mutation.isPending ||
              !n.stock ||
              quantity < 1 ||
              quantity > n.stock
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Adicionando…"
              : n.stock
                ? "Adicionar ao carrinho"
                : "Edição esgotada"}
            <ArrowUpRight size={18} />
          </Button>
          {notice && (
            <p role="status">
              {notice} <Link to="/cart">Ver carrinho →</Link>
            </p>
          )}
          {mutation.isError && <p role="alert">{message(mutation.error)}</p>}
          <p className="security">
            <ShieldCheck size={16} />
            Compra demonstrativa · Sem blockchain real
          </p>
          <dl className="metadata">
            <div>
              <dt>Rede</dt>
              <dd>Ethereum</dd>
            </div>
            <div>
              <dt>Formato</dt>
              <dd>Arte digital · SVG</dd>
            </div>
            <div>
              <dt>Propriedade</dt>
              <dd>
                {user
                  ? "Colecione com sua conta"
                  : "Entre para finalizar sua coleção"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
