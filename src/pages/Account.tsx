import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowUpRight, Wallet as WalletIcon } from "lucide-react";
import { api, get, message, queryClient } from "../lib/api";
import { useSession } from "../lib/session";
import type {
  User,
  Wallet,
  NFT,
  SocialProvider,
  SocialLoginRequest,
} from "../lib/contracts";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Skeleton, ErrorState } from "../components/Layout";
function SocialIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "facebook")
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#1877f2" />
        <path
          fill="#fff"
          d="M13.6 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3V10H7.4v3h2.8v8z"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="#4285f4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c2-1.8 2.9-4.4 2.9-7.5"
      />
      <path
        fill="#34a853"
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6a6 6 0 0 1-9-3.1H3v2.7A10 10 0 0 0 12 22"
      />
      <path fill="#fbbc05" d="M6.4 14a6 6 0 0 1 0-4V7.3H3a10 10 0 0 0 0 9.4z" />
      <path
        fill="#ea4335"
        d="M12 6c1.5 0 2.8.5 3.9 1.5l3-3A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.3L6.4 10A6 6 0 0 1 12 6"
      />
    </svg>
  );
}
export function Auth({ register = false }: { register?: boolean }) {
  const search = useSearch({ strict: false }) as { returnTo?: string };
  const navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<SocialProvider>("google");
  const [socialOpen, setSocialOpen] = useState(false);
  const providerName = provider === "google" ? "Google" : "Facebook";
  async function authenticate(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<User>(path, body);
      await queryClient.cancelQueries();
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "session",
      });
      queryClient.setQueryData(["session"], data);
      await navigate({ to: search.returnTo || "/profile" });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void authenticate(
      `/session/${register ? "register" : "login"}`,
      Object.fromEntries(new FormData(e.currentTarget)),
    );
  }
  function socialLogin(outcome: SocialLoginRequest["outcome"]) {
    const request: SocialLoginRequest = { provider, outcome };
    void authenticate("/session/social", request);
  }
  return (
    <section className="container auth-grid page">
      <div className="auth-art">
        <img
          src="/art/emerald-ape.jpg"
          alt="Emerald Ape com jaqueta verde e óculos de sol"
          width="640"
          height="560"
        />
        <div>
          <p className="eyebrow">SEU PRÓXIMO FAVORITO ESTÁ AQUI</p>
          <h2>
            Um universo de arte.
            <br />
            Uma coleção só sua.
          </h2>
        </div>
      </div>
      <div className="auth-form">
        <p className="eyebrow">BEM-VINDO À KURIO</p>
        <h1>{register ? "Crie novas conexões." : "Bom ter você aqui."}</h1>
        <p>
          {register
            ? "Sua jornada como colecionador começa agora."
            : "Entre para continuar sua coleção."}
        </p>
        <form
          onSubmit={submit}
          aria-describedby={error && !socialOpen ? "auth-error" : undefined}
        >
          {register && (
            <label>
              Nome completo
              <input name="name" required minLength={2} autoComplete="name" />
            </label>
          )}
          <label>
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@exemplo.com"
            />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={register ? 8 : 1}
              pattern={register ? "(?=.*[A-Z])(?=.*[0-9]).{8,}" : undefined}
              autoComplete={register ? "new-password" : "current-password"}
              aria-describedby={register ? "password-hint" : undefined}
            />
          </label>
          {register && (
            <small id="password-hint">
              Pelo menos 8 caracteres, uma letra maiúscula e um número.
            </small>
          )}
          {error && !socialOpen && (
            <p id="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? "Aguarde…" : register ? "Criar minha conta" : "Entrar"}
            <ArrowUpRight size={18} />
          </Button>
        </form>
        <div className="social-login" aria-label="Outras opções de login">
          <div className="auth-divider">
            <span>Ou continue com</span>
          </div>
          {(["google", "facebook"] as const).map((name) => (
            <Button
              key={name}
              id={`${name}-login`}
              type="button"
              variant="outline"
              className="social-button"
              disabled={busy}
              onClick={() => {
                setProvider(name);
                setError("");
                setSocialOpen(true);
              }}
            >
              <SocialIcon provider={name} />
              Continuar com {name === "google" ? "Google" : "Facebook"}
            </Button>
          ))}
          <p className="social-hint">
            Login social de demonstração. Nenhuma conta real será conectada.
          </p>
        </div>
        <Dialog
          open={socialOpen}
          onOpenChange={(open) => {
            if (!busy) {
              setSocialOpen(open);
              if (!open) setError("");
            }
          }}
        >
          <DialogContent
            title={`${providerName} · demonstração`}
            description={`Use a conta fictícia ${provider}@jungle.test para experimentar o login. Nenhuma senha ou autorização do ${providerName} real é solicitada.`}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.getElementById(`${provider}-login`)?.focus();
            }}
          >
            <div className="social-account">
              <SocialIcon provider={provider} />
              <span>
                Colecionador {providerName}
                <small>{provider}@jungle.test</small>
              </span>
            </div>
            {error && <p role="alert">{error}</p>}
            <div className="social-dialog-actions">
              <Button disabled={busy} onClick={() => socialLogin("allow")}>
                {busy ? "Aguarde…" : `Entrar com ${providerName} (demo)`}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => socialLogin("deny")}
              >
                Simular recusa
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setSocialOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <p>
          {register ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
          <Link
            to={register ? "/login" : "/register"}
            search={{ returnTo: search.returnTo || "/profile" }}
          >
            {register ? "Entrar" : "Cadastre-se"}
          </Link>
        </p>
        <div className="demo-credentials">
          <strong>Conta de demonstração</strong>
          <p>alex@jungle.test · Jungle123!</p>
          <small>Use apenas dados fictícios neste ambiente.</small>
        </div>
      </div>
    </section>
  );
}
function AccountNav() {
  return (
    <nav className="account-nav" aria-label="Conta">
      <Link to="/profile">Meu perfil</Link>
      <Link to="/wallets">Minhas carteiras</Link>
    </nav>
  );
}
export function Profile() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(""),
    [notice, setNotice] = useState(""),
    [fileError, setFileError] = useState("");
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: ({ signal }) => get<User>("/profile", signal),
    enabled: !!user,
  });
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: ({ signal }) => get<string[]>("/favorites", signal),
    enabled: !!user,
  });
  const catalog = useQuery({
    queryKey: ["favorites-detail", user?.id, favorites.data],
    queryFn: ({ signal }) =>
      Promise.all(
        (favorites.data || []).map((id) => get<NFT>(`/nfts/${id}`, signal)),
      ),
    enabled: !!user && !!favorites.data?.length,
  });
  useEffect(() => {
    if (profile.data) setAvatar(profile.data.avatar);
  }, [profile.data]);
  useEffect(() => {
    if (user === null)
      void navigate({ to: "/login", search: { returnTo: "/profile" } });
  }, [user]);
  const update = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue | string>) =>
      api.patch<User>("/profile", body),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(["session"], data);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      setNotice("Perfil atualizado.");
    },
  });
  const password = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue>) =>
      api.post("/profile/password", body),
    onSuccess: () =>
      setNotice("Senha alterada. Use a nova senha no próximo login."),
  });
  if (profile.isPending)
    return (
      <section className="container page">
        <Skeleton cards={1} />
      </section>
    );
  if (profile.isError)
    return (
      <section className="container page">
        <ErrorState
          error={profile.error}
          retry={() => void profile.refetch()}
        />
      </section>
    );
  return (
    <section className="container page account">
      <h1>Seu espaço na Jungle.</h1>
      <AccountNav />
      <div className="account-grid">
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice("");
            update.mutate({
              ...Object.fromEntries(new FormData(e.currentTarget)),
              avatar,
            });
          }}
        >
          <h2>Dados do colecionador</h2>
          <div className="avatar-editor">
            {avatar ? (
              <img src={avatar} alt="Seu avatar" width="72" height="72" />
            ) : (
              <span className="profile-avatar">{profile.data.name[0]}</span>
            )}
            <label>
              Alterar avatar
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    file.size > 500_000 ||
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    )
                  ) {
                    setFileError("Use PNG, JPEG ou WebP de até 500 KB.");
                    return;
                  }
                  setFileError("");
                  const reader = new FileReader();
                  reader.onload = () => setAvatar(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          {fileError && <p role="alert">{fileError}</p>}
          <label>
            Nome completo
            <input
              name="name"
              required
              minLength={2}
              defaultValue={profile.data.name}
            />
          </label>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              required
              defaultValue={profile.data.email}
            />
          </label>
          <Button disabled={update.isPending}>Salvar perfil</Button>
          {update.isError && <p role="alert">{message(update.error)}</p>}
        </form>
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice("");
            password.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <h2>Alterar senha</h2>
          <label>
            Senha atual
            <input
              name="current"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            Nova senha
            <input
              name="password"
              type="password"
              required
              minLength={8}
              pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}"
              autoComplete="new-password"
              aria-describedby="new-password-hint"
            />
          </label>
          <small id="new-password-hint">
            8 caracteres, maiúscula e número.
          </small>
          <Button disabled={password.isPending}>Atualizar senha</Button>
          {password.isError && <p role="alert">{message(password.error)}</p>}
        </form>
      </div>
      {notice && <p role="status">{notice}</p>}
      <h2 className="favorites-heading">Suas obras favoritas</h2>
      {favorites.isPending || catalog.isFetching ? (
        <Skeleton />
      ) : favorites.isError ? (
        <ErrorState
          error={favorites.error}
          retry={() => void favorites.refetch()}
        />
      ) : !favorites.data?.length ? (
        <p>
          Nenhuma obra favorita ainda. <Link to="/">Explore o catálogo.</Link>
        </p>
      ) : catalog.isError ? (
        <ErrorState
          error={catalog.error}
          retry={() => void catalog.refetch()}
        />
      ) : (
        <div className="nft-grid">
          {catalog.data?.map((n) => (
            <Link
              key={n.id}
              to="/nft/$id"
              params={{ id: n.id }}
              className="favorite-card"
            >
              <img src={n.image} alt={n.name} width="250" height="250" />
              <h3>{n.name}</h3>
              <p>{n.price} ETH</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
export function Wallets() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Wallet | null>(null),
    [notice, setNotice] = useState("");
  const wallets = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: ({ signal }) => get<Wallet[]>("/wallets", signal),
    enabled: !!user,
  });
  useEffect(() => {
    if (user === null)
      void navigate({ to: "/login", search: { returnTo: "/wallets" } });
  }, [user]);
  const mutation = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue | boolean>) =>
      editing
        ? api.patch(`/wallets/${editing.id}`, body)
        : api.post("/wallets", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wallets"] });
      setEditing(null);
      setNotice("Carteira salva.");
    },
  });
  if (wallets.isPending)
    return (
      <section className="container page">
        <Skeleton cards={2} />
      </section>
    );
  if (wallets.isError)
    return (
      <section className="container page">
        <ErrorState
          error={wallets.error}
          retry={() => void wallets.refetch()}
        />
      </section>
    );
  return (
    <section className="container page account">
      <h1>Suas carteiras.</h1>
      <AccountNav />
      <p className="page-intro">
        Endereços fictícios para explorar novas possibilidades.
      </p>
      <div className="account-grid">
        <div className="wallet-list">
          {wallets.data?.map((wallet) => (
            <article className="wallet-card" key={wallet.id}>
              <WalletIcon />
              <h2>{wallet.name}</h2>
              <p className="break">{wallet.address}</p>
              <p>
                {wallet.network} · {wallet.primary ? "Principal" : "Secundária"}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(wallet);
                  mutation.reset();
                }}
              >
                Editar carteira
              </Button>
            </article>
          ))}
          {!wallets.data?.length && <p>Nenhuma carteira cadastrada.</p>}
        </div>
        <form
          className="form-card"
          key={editing?.id || `new-${wallets.data?.length}`}
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setNotice("");
            mutation.mutate({
              ...Object.fromEntries(form),
              primary: form.get("primary") === "on",
            });
          }}
        >
          <h2>{editing ? "Editar carteira" : "Adicionar carteira"}</h2>
          <label>
            Nome da carteira
            <input name="name" required defaultValue={editing?.name} />
          </label>
          <label>
            Endereço
            <input
              name="address"
              required
              pattern="0x[a-fA-F0-9]{40}"
              placeholder="0x… (40 caracteres hexadecimais)"
              defaultValue={editing?.address}
            />
          </label>
          <label>
            Rede
            <select
              name="network"
              defaultValue={editing?.network || "Ethereum"}
            >
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="primary"
              defaultChecked={editing?.primary}
            />
            Usar como carteira principal
          </label>
          <Button disabled={mutation.isPending}>Salvar carteira</Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                mutation.reset();
              }}
            >
              Cancelar edição
            </Button>
          )}
          {mutation.isError && <p role="alert">{message(mutation.error)}</p>}
        </form>
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
