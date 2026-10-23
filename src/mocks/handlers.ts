import { http, HttpResponse, delay, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import {
  database as data,
  account,
  save,
  digest,
  publicUser,
  reset,
} from "./database";
import {
  eth,
  decimal,
  type Quote,
  type Scenario,
  type Order,
} from "../lib/contracts";
const sockets = new Set<{
  send: (event: string, payload: unknown) => void;
  close: () => void;
}>();
let lastNFTEvent:
  { id: string; resourceId: string; version: number } | undefined;
const emit = (event: string, payload: unknown) =>
  sockets.forEach((s) => s.send(event, payload));
const fail = (message: string, status = 400, fields?: Record<string, string>) =>
  HttpResponse.json({ message, fields }, { status });
const privatePaths = ["favorites", "profile", "wallets", "orders"];
function quote(coupon = ""): Quote {
  const db = data(),
    key = account()?.id || "guest";
  const items = (db.carts[key] || []).map((i) => ({
    ...i,
    nft: db.nfts.find((n) => n.id === i.nftId)!,
  }));
  const subtotal = items.reduce(
    (n, i) => n + eth(i.nft.price) * BigInt(i.quantity),
    0n,
  );
  const discount = coupon === "JUNGLE10" ? subtotal / 10n : 0n;
  const fee = items.length ? eth("0.003") : 0n;
  return {
    items: structuredClone(items),
    subtotal: decimal(subtotal),
    discount: decimal(discount),
    fee: decimal(fee),
    total: decimal(subtotal - discount + fee),
    coupon,
    fingerprint: JSON.stringify({
      items: items.map((i) => [i.nftId, i.quantity, i.nft.version]),
      coupon,
      subtotal: String(subtotal),
      fee: String(fee),
    }),
  };
}
function updateNFT(soldOut = false) {
  const db = data();
  const first = (db.carts[account()?.id || "guest"] || [])[0];
  const nft = db.nfts.find((n) => n.id === (first?.nftId || "1"))!;
  nft.price = decimal(eth(nft.price) + eth("0.1"));
  if (soldOut) nft.stock = 0;
  nft.version++;
  save();
  lastNFTEvent = {
    id: crypto.randomUUID(),
    resourceId: nft.id,
    version: nft.version,
  };
  emit("nft.updated", lastNFTEvent);
}
function settle(order: Order) {
  if (order.status !== "pending") return;
  const unavailable = order.quote.items.some(
    (item) => !data().nfts.some((nft) => nft.id === item.nftId),
  );
  order.status =
    data().scenario === "declined" || unavailable ? "declined" : "confirmed";
  order.version++;
  if (order.status === "confirmed") {
    const cart = data().carts[order.userId] || [];
    for (const item of order.quote.items) {
      const nft = data().nfts.find((n) => n.id === item.nftId)!;
      nft.stock = Math.max(0, nft.stock - item.quantity);
      nft.version++;
      const current = cart.find((i) => i.nftId === item.nftId);
      if (current)
        current.quantity = Math.max(0, current.quantity - item.quantity);
      emit("nft.updated", {
        id: crypto.randomUUID(),
        resourceId: nft.id,
        version: nft.version,
      });
    }
    data().carts[order.userId] = cart.filter((i) => i.quantity > 0);
  }
  save();
  emit("order.updated", {
    id: crypto.randomUUID(),
    resourceId: order.id,
    version: order.version,
    userId: order.userId,
  });
}
export function resumeOrders() {
  data()
    .orders.filter((o) => o.status === "pending")
    .forEach((o) =>
      setTimeout(
        () => settle(o),
        Math.max(100, 2500 - (Date.now() - o.createdAt)),
      ),
    );
}
const channel = ws.link("wss://jungle.mock");
export const handlers = [
  channel.addEventListener("connection", (connection) => {
    const io = toSocketIo(connection);
    const socket = {
      send: (event: string, payload: unknown) => io.client.emit(event, payload),
      close: () => connection.client.close(1001, "Interrupção simulada"),
    };
    sockets.add(socket);
    const heartbeat = setInterval(() => connection.client.send("2"), 20_000);
    connection.client.addEventListener("close", () => {
      clearInterval(heartbeat);
      sockets.delete(socket);
    });
  }),
  http.all("/api/*", async ({ request }) => {
    const url = new URL(request.url),
      path = url.pathname.replace("/api/", "").split("/"),
      method = request.method,
      db = data();
    if (path[0] === "mock") {
      const body =
        method === "POST"
          ? ((await request.json()) as Record<string, string>)
          : {};
      if (path[1] === "reset") {
        await reset((body.scenario || "default") as Scenario);
        return HttpResponse.json({ ok: true });
      }
      if (path[1] === "event") {
        if (body.kind === "duplicate" && lastNFTEvent)
          emit("nft.updated", lastNFTEvent);
        else if (body.kind === "old" && lastNFTEvent)
          emit("nft.updated", {
            ...lastNFTEvent,
            id: crypto.randomUUID(),
            version: Math.max(0, lastNFTEvent.version - 1),
          });
        else updateNFT(body.kind === "sold-out");
        return HttpResponse.json({ ok: true });
      }
      if (path[1] === "disconnect") {
        sockets.forEach((s) => s.close());
        return HttpResponse.json({ ok: true });
      }
      if (path[1] === "expire") {
        db.session = null;
        save();
        return HttpResponse.json({ ok: true });
      }
      if (path[1] === "scenario") {
        db.scenario = body.scenario as Scenario;
        save();
        if (body.scenario === "price-change" || body.scenario === "sold-out")
          setTimeout(() => updateNFT(body.scenario === "sold-out"), 2000);
        return HttpResponse.json({ ok: true });
      }
    }
    if (db.scenario === "slow") await delay(1800);
    else if (db.scenario === "out-of-order")
      await delay(url.searchParams.get("q")?.length === 1 ? 1400 : 100);
    else await delay(120);
    if (db.scenario === "offline") return HttpResponse.error();
    if (db.scenario === "server-error")
      return fail("Serviço temporariamente indisponível.", 503);
    if (db.scenario === "expired") {
      db.session = null;
      save();
    }
    const user = account(),
      key = user?.id || "guest";
    if (
      (privatePaths.includes(path[0]) ||
        request.headers.get("X-Require-Session") === "true") &&
      !user
    )
      return fail("Sua sessão expirou. Entre para continuar.", 401);
    const body =
      method !== "GET" && method !== "DELETE"
        ? ((await request.json()) as Record<string, any>)
        : {};
    if (path[0] === "session") {
      if (method === "GET")
        return HttpResponse.json(user ? publicUser(user) : null);
      if (method === "DELETE") {
        db.session = null;
        save();
        return HttpResponse.json({ ok: true });
      }
      let found: (typeof db.users)[number] | undefined;
      if (path[1] === "social") {
        if (
          !["google", "facebook"].includes(body.provider) ||
          !["allow", "deny"].includes(body.outcome)
        ) {
          return fail("Provedor ou resultado de autenticação inválido.", 422);
        }
        if (body.outcome === "deny")
          return fail(
            "Acesso recusado. Você pode tentar novamente ou usar e-mail e senha.",
            403,
          );
        const providerName = body.provider === "google" ? "Google" : "Facebook";
        const id = `social-${body.provider}`;
        found = db.users.find((user) => user.id === id);
        if (!found) {
          const email = `${body.provider}@jungle.test`;
          if (db.users.some((user) => user.email === email))
            return fail(
              "O e-mail desta conta de demonstração já está cadastrado. Entre com e-mail e senha.",
              409,
            );
          const salt = crypto.randomUUID();
          found = {
            id,
            name: `Colecionador ${providerName}`,
            email,
            avatar: "",
            salt,
            hash: await digest("Jungle123!", salt),
            favorites: [],
            wallets: [
              {
                id: `wallet-${body.provider}`,
                name: `Carteira ${providerName} (demo)`,
                address: `0x${(body.provider === "google" ? "3" : "4").repeat(40)}`,
                network: "Ethereum",
                primary: true,
              },
            ],
          };
          db.users.push(found);
        }
      } else {
        if (path[1] === "register") {
          if (
            !String(body.name || "").trim() ||
            !/^\S+@\S+\.\S+$/.test(body.email) ||
            !/(?=.*[A-Z])(?=.*[0-9]).{8,}/.test(body.password)
          )
            return fail(
              "Revise nome, e-mail e senha (8 caracteres, maiúscula e número).",
              422,
            );
          if (db.users.some((u) => u.email === body.email))
            return fail("Este e-mail já está cadastrado.", 409);
          const salt = crypto.randomUUID();
          db.users.push({
            id: crypto.randomUUID(),
            name: body.name,
            email: body.email,
            avatar: "",
            salt,
            hash: await digest(body.password, salt),
            wallets: [],
            favorites: [],
          });
        }
        found = db.users.find((u) => u.email === body.email);
        if (!found || found.hash !== (await digest(body.password, found.salt)))
          return fail("E-mail ou senha incorretos.", 401);
      }
      db.session = { userId: found.id, expires: Date.now() + 3600_000 };
      const cart = db.carts[found.id] || [];
      for (const item of db.carts.guest || []) {
        const existing = cart.find((i) => i.nftId === item.nftId),
          stock = db.nfts.find((n) => n.id === item.nftId)!.stock;
        if (existing)
          existing.quantity = Math.min(
            stock,
            existing.quantity + item.quantity,
          );
        else if (stock)
          cart.push({ ...item, quantity: Math.min(item.quantity, stock) });
      }
      db.carts[found.id] = cart;
      db.carts.guest = [];
      save();
      return HttpResponse.json(publicUser(found));
    }
    if (path[0] === "nfts") {
      if (path[1]) {
        const nft = db.nfts.find((n) => n.id === path[1]);
        return nft ? HttpResponse.json(nft) : fail("NFT não encontrado.", 404);
      }
      let list =
        db.scenario === "empty"
          ? []
          : db.nfts.filter(
              (n) =>
                n.name
                  .toLowerCase()
                  .includes((url.searchParams.get("q") || "").toLowerCase()) &&
                (!url.searchParams.get("category") ||
                  url.searchParams
                    .get("category")!
                    .split(",")
                    .includes(n.category)) &&
                (!url.searchParams.get("available") || n.stock > 0),
            );
      const sort = url.searchParams.get("sort");
      if (sort === "low" || sort === "high")
        list = list.sort(
          (a, b) =>
            (eth(a.price) < eth(b.price) ? -1 : 1) * (sort === "high" ? -1 : 1),
        );
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      return HttpResponse.json({
        items: list.slice((page - 1) * 8, page * 8),
        total: list.length,
      });
    }
    if (path[0] === "favorites") {
      if (db.scenario === "favorite-error" && method !== "GET")
        return fail("Não foi possível atualizar o favorito.", 503);
      if (method === "POST")
        user!.favorites = Array.from(new Set([...user!.favorites, path[1]]));
      if (method === "DELETE")
        user!.favorites = user!.favorites.filter((id) => id !== path[1]);
      save();
      return HttpResponse.json(user!.favorites);
    }
    if (path[0] === "cart") {
      db.carts[key] ||= [];
      if (method === "DELETE")
        db.carts[key] = db.carts[key].filter((i) => i.nftId !== path[1]);
      if (method === "POST" || method === "PATCH") {
        const nft = db.nfts.find((n) => n.id === (path[1] || body.nftId));
        if (!nft) return fail("NFT não encontrado.", 404);
        const current = db.carts[key].find((i) => i.nftId === nft.id);
        const quantity =
          method === "POST"
            ? (current?.quantity || 0) + body.quantity
            : body.quantity;
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > nft.stock)
          return fail("Quantidade indisponível para esta edição.", 409);
        if (current) current.quantity = quantity;
        else db.carts[key].push({ nftId: nft.id, quantity });
      }
      save();
      return HttpResponse.json(quote(db.coupons[key] || ""));
    }
    if (path[0] === "quote") {
      const coupon = String(body.coupon ?? db.coupons[key] ?? "").toUpperCase();
      if (coupon && coupon !== "JUNGLE10")
        return fail(
          coupon === "EXPIRED" ? "Cupom expirado." : "Cupom inválido.",
          422,
        );
      if (quote().items.some((i) => i.quantity > i.nft.stock))
        return fail("Uma edição está esgotada. Revise o carrinho.", 409);
      db.coupons[key] = coupon;
      save();
      return HttpResponse.json(quote(coupon));
    }
    if (path[0] === "orders") {
      if (method === "GET") {
        const order = db.orders.find(
          (o) => o.id === path[1] && o.userId === user!.id,
        );
        return order
          ? HttpResponse.json(order)
          : fail("Pedido não encontrado.", 404);
      }
      const idempotency = request.headers.get("Idempotency-Key");
      if (!idempotency) return fail("Chave de idempotência obrigatória.", 422);
      const stored = db.keys[`${user!.id}:${idempotency}`];
      const serialized = JSON.stringify(body);
      if (stored)
        return stored.body === serialized
          ? HttpResponse.json(db.orders.find((o) => o.id === stored.orderId))
          : fail("Chave utilizada com dados diferentes.", 409);
      const current = quote(db.coupons[key] || "");
      if (body.fingerprint !== current.fingerprint)
        return fail("A cotação mudou. Revise e confirme novamente.", 409);
      if (
        !current.items.length ||
        current.items.some((i) => i.quantity > i.nft.stock)
      )
        return fail("Itens indisponíveis. Revise o carrinho.", 409);
      const wallet = user!.wallets.find((w) => w.id === body.walletId);
      if (!wallet || wallet.network !== body.network)
        return fail("Selecione uma carteira e rede compatíveis.", 422);
      const order: Order = {
        id: crypto.randomUUID(),
        userId: user!.id,
        status: "pending",
        quote: structuredClone(current),
        version: 1,
        transaction: `0x${crypto.randomUUID().replaceAll("-", "")}`,
        createdAt: Date.now(),
      };
      db.orders.push(order);
      db.keys[`${user!.id}:${idempotency}`] = {
        body: serialized,
        orderId: order.id,
      };
      save();
      setTimeout(() => settle(order), 2500);
      if (db.scenario === "timeout") await delay(12_000);
      return HttpResponse.json(order, { status: 201 });
    }
    if (path[0] === "profile") {
      if (method === "PATCH") {
        if (
          !String(body.name || "").trim() ||
          !/^\S+@\S+\.\S+$/.test(body.email)
        )
          return fail("Informe nome e e-mail válidos.", 422);
        if (db.users.some((u) => u.id !== user!.id && u.email === body.email))
          return fail("E-mail em uso.", 409);
        if (
          body.avatar &&
          !/^data:image\/(png|jpeg|webp);base64,/.test(body.avatar)
        )
          return fail("Avatar inválido.", 422);
        Object.assign(user!, {
          name: body.name,
          email: body.email,
          avatar: body.avatar || "",
        });
      }
      if (path[1] === "password") {
        if ((await digest(body.current, user!.salt)) !== user!.hash)
          return fail("Senha atual incorreta.", 422);
        if (!/(?=.*[A-Z])(?=.*[0-9]).{8,}/.test(body.password))
          return fail("Senha deve ter 8 caracteres, maiúscula e número.", 422);
        user!.hash = await digest(body.password, user!.salt);
      }
      save();
      return HttpResponse.json(publicUser(user!));
    }
    if (path[0] === "wallets") {
      if (method !== "GET") {
        if (
          !/^0x[a-fA-F0-9]{40}$/.test(body.address) ||
          !String(body.name || "").trim() ||
          !["Ethereum", "Polygon"].includes(body.network)
        )
          return fail("Informe nome, rede e endereço EVM válido.", 422);
        if (
          user!.wallets.some(
            (w) => w.address === body.address && w.id !== path[1],
          )
        )
          return fail("Carteira já cadastrada.", 409);
        if (body.primary) user!.wallets.forEach((w) => (w.primary = false));
        const existing = user!.wallets.find((w) => w.id === path[1]);
        if (path[1] && !existing) return fail("Carteira não encontrada.", 404);
        const fields = {
          name: body.name,
          address: body.address,
          network: body.network,
          primary: !!body.primary,
        };
        if (existing) Object.assign(existing, fields);
        else user!.wallets.push({ id: crypto.randomUUID(), ...fields });
        save();
      }
      return HttpResponse.json(user!.wallets);
    }
    return fail("Recurso não encontrado.", 404);
  }),
];
