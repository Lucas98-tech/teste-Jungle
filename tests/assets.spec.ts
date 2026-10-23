import { test, expect } from "@playwright/test";
import { reset, add } from "./helpers";

test("foto original aparece no destaque, detalhe e carrinho salvo", async ({
  page,
}) => {
  await reset(page);
  const hero = page.getByRole("img", {
    name: "Emerald Ape com jaqueta verde, óculos de sol e pingente de esmeralda",
  });
  await expect(hero).toHaveAttribute("src", "/art/emerald-ape.jpg");
  await expect
    .poll(() => hero.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(400);
  await add(page);
  await page.evaluate(() => {
    const database = JSON.parse(localStorage.getItem("jungle.mock.v1")!);
    database.nfts.find((nft: { id: string }) => nft.id === "1").image =
      "/art/0.svg";
    localStorage.setItem("jungle.mock.v1", JSON.stringify(database));
  });
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Arte digital Emerald Ape #042" }),
  ).toHaveAttribute("src", "/art/emerald-ape.jpg");
  await page.goto("/cart");
  await expect(page.locator(".cart-item img")).toHaveAttribute(
    "src",
    "/art/emerald-ape.jpg",
  );
  await expect(page.getByLabel("Quantidade de Emerald Ape #042")).toHaveValue(
    "1",
  );
});

for (const asset of [
  {
    id: "2",
    name: "Sage Nomad #009",
    image: "/art/sage-nomad.jpg",
    previous: "/art/1.svg",
  },
  {
    id: "3",
    name: "Ivory Baron #008",
    image: "/art/ivory-baron.jpg",
    previous: "/art/2.svg",
  },
  {
    id: "4",
    name: "Golden Best #017",
    image: "/art/golden-best.jpg",
    previous: "/art/3.svg",
  },
]) {
  test(`foto original de ${asset.name} persiste no detalhe e carrinho`, async ({
    page,
  }) => {
    await reset(page);
    await add(page, asset.id);
    const photo = page.getByRole("img", { name: `Arte digital ${asset.name}` });
    await expect(photo).toHaveAttribute("src", asset.image);
    await expect
      .poll(() =>
        photo.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBe(400);
    await page.evaluate(({ id, previous }) => {
      const database = JSON.parse(localStorage.getItem("jungle.mock.v1")!);
      database.nfts.find((nft: { id: string }) => nft.id === id).image =
        previous;
      localStorage.setItem("jungle.mock.v1", JSON.stringify(database));
    }, asset);
    await page.reload();
    await expect(photo).toHaveAttribute("src", asset.image);
    await page.goto("/cart");
    await expect(page.locator(".cart-item img")).toHaveAttribute(
      "src",
      asset.image,
    );
    await expect(page.getByLabel(`Quantidade de ${asset.name}`)).toHaveValue(
      "1",
    );
  });
}

test("catálogo mantém só as quatro fotos enviadas e limpa itens antigos salvos", async ({
  page,
}) => {
  await reset(page);
  await expect(page.locator(".nft-card")).toHaveCount(4);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("jungle.mock.v1")!);
    db.nfts.push({
      ...db.nfts[0],
      id: "5",
      name: "Crimson King #023",
      image: "/art/4.svg",
    });
    db.carts.guest = [
      { nftId: "5", quantity: 1 },
      { nftId: "1", quantity: 1 },
    ];
    db.users[0].favorites = ["5", "1"];
    localStorage.setItem("jungle.mock.v1", JSON.stringify(db));
  });
  await page.reload();
  await expect(page.locator(".nft-card")).toHaveCount(4);
  await expect(page.locator(".nft-card")).toHaveText([
    /Emerald Ape #042/,
    /Sage Nomad #009/,
    /Ivory Baron #008/,
    /Golden Best #017/,
  ]);
  await page.goto("/cart");
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expect(page.locator(".cart-item")).toContainText("Emerald Ape #042");
  await page.goto("/nft/5");
  await expect(page.getByRole("alert")).toHaveText("NFT não encontrado.");
});
