import type {
  NFT,
  User,
  Wallet,
  CartItem,
  Order,
  Scenario,
} from "../lib/contracts";
export const titles = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Ivory Baron #008",
  "Golden Best #017",
];
const categories = ["Arte", "Fotografia", "3D", "Ilustração"];
const originalArt: Record<string, string> = {
  "1": "/art/emerald-ape.jpg",
  "2": "/art/sage-nomad.jpg",
  "3": "/art/ivory-baron.jpg",
  "4": "/art/golden-best.jpg",
};
export const fixtures: NFT[] = titles.map((name, i) => ({
  id: String(i + 1),
  name,
  artist: ["Kurio Apes", "Nomad Club", "Baron Collective", "Golden Studio"][
    i % 4
  ],
  category: categories[i % 4],
  price: ["1.19", "1.39", "1.58", "1.98", "1.43", "2.15"][i % 6],
  stock: 5 + i,
  version: 1,
  image: originalArt[String(i + 1)],
  edition: "Edição limitada",
}));
type Account = User & {
  hash: string;
  salt: string;
  wallets: Wallet[];
  favorites: string[];
};
export type DB = {
  nfts: NFT[];
  users: Account[];
  carts: Record<string, CartItem[]>;
  coupons: Record<string, string>;
  orders: Order[];
  keys: Record<string, { body: string; orderId: string }>;
  session: { userId: string; expires: number } | null;
  scenario: Scenario;
};
export async function digest(password: string, salt: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${password}`),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
let db: DB;
export function save() {
  localStorage.setItem("jungle.mock.v1", JSON.stringify(db));
}
export async function reset(scenario: Scenario = "default") {
  const users: Account[] = [];
  for (const [id, name, email] of [
    ["u1", "Alex Colecionador", "alex@jungle.test"],
    ["u2", "Sam Artista", "sam@jungle.test"],
  ]) {
    const salt = crypto.randomUUID();
    users.push({
      id,
      name,
      email,
      avatar: "",
      salt,
      hash: await digest("Jungle123!", salt),
      favorites: [],
      wallets: [
        {
          id: `w-${id}`,
          name: "Minha carteira",
          address: `0x${id === "u1" ? "1" : "2"}`.padEnd(42, "a"),
          network: "Ethereum",
          primary: true,
        },
      ],
    });
  }
  db = {
    nfts: structuredClone(fixtures),
    users,
    carts: { guest: [] },
    coupons: {},
    orders: [],
    keys: {},
    session: null,
    scenario,
  };
  save();
  return db;
}
export async function init() {
  try {
    db = JSON.parse(localStorage.getItem("jungle.mock.v1") || "null");
  } catch {
    /* reset invalid storage */
  }
  if (!db) await reset();
  // Migre o catálogo existente sem apagar contas ou snapshots de recibos.
  const allowed = new Set(fixtures.map((nft) => nft.id));
  db.nfts = db.nfts.filter((nft) => allowed.has(nft.id));
  for (const nft of db.nfts) nft.image = originalArt[nft.id];
  for (const [owner, items] of Object.entries(db.carts)) {
    db.carts[owner] = items.filter((item) => allowed.has(item.nftId));
  }
  for (const user of db.users) {
    user.favorites = user.favorites.filter((id) => allowed.has(id));
  }
  save();
  return db;
}
export const database = () => db;
export const account = () => {
  if (db.session && db.session.expires > Date.now())
    return db.users.find((u) => u.id === db.session!.userId);
  return undefined;
};
export const publicUser = (u: Account): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  avatar: u.avatar,
});
