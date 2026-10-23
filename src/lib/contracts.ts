export type NFT = {
  id: string;
  name: string;
  artist: string;
  category: string;
  price: string;
  stock: number;
  version: number;
  image: string;
  edition: string;
};
export type SocialProvider = "google" | "facebook";
export type SocialLoginRequest = {
  provider: SocialProvider;
  outcome: "allow" | "deny";
};
export type User = { id: string; name: string; email: string; avatar: string };
export type Wallet = {
  id: string;
  name: string;
  address: string;
  network: string;
  primary: boolean;
};
export type CartItem = { nftId: string; quantity: number };
export type Quote = {
  items: (CartItem & { nft: NFT })[];
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  fingerprint: string;
  coupon: string;
};
export type Order = {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "declined";
  quote: Quote;
  version: number;
  transaction: string;
  createdAt: number;
};
export type MarketEvent = {
  id: string;
  resourceId: string;
  version: number;
  userId?: string;
};
export type Scenario =
  | "default"
  | "slow"
  | "out-of-order"
  | "offline"
  | "server-error"
  | "expired"
  | "favorite-error"
  | "price-change"
  | "sold-out"
  | "timeout"
  | "declined"
  | "empty";
export const scenarios: Scenario[] = [
  "default",
  "slow",
  "out-of-order",
  "offline",
  "server-error",
  "expired",
  "favorite-error",
  "price-change",
  "sold-out",
  "timeout",
  "declined",
  "empty",
];
export const eth = (value: string) =>
  BigInt(value.split(".")[0] || "0") * 10n ** 18n +
  BigInt((value.split(".")[1] || "").padEnd(18, "0").slice(0, 18));
export const decimal = (value: bigint) =>
  `${value / 10n ** 18n}.${(value % 10n ** 18n).toString().padStart(18, "0")}`.replace(
    /\.?0+$/,
    "",
  ) || "0";
