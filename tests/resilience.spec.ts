import { test, expect } from "@playwright/test";
import { reset, login, add, checkout, scenario, event } from "./helpers";
async function control(page: import("@playwright/test").Page, path: string) {
  await expect(page.locator("html")).toHaveAttribute("data-mocks", "ready");
  await page.evaluate(async (path) => {
    await fetch(`/api/mock/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  }, path);
}
test.beforeEach(async ({ page }) => reset(page));
test("sessão expira no checkout e retoma o carrinho após login", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: "Quase na sua coleção." }),
  ).toBeVisible();
  await control(page, "expire");
  await page.getByLabel("Carteira", { exact: true }).selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Simular conexão", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Entendo/ }).check();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("E-mail", { exact: true }).fill("alex@jungle.test");
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Quase na sua coleção." }),
  ).toBeVisible();
  await expect(page.locator(".mini-item")).toContainText("Emerald Ape #042");
});
test("estoque muda no carrinho, eventos repetidos e antigos não alteram o preço", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/cart");
  await expect(page.locator(".total dd")).toHaveText("1.193 ETH");
  await event(page);
  await expect(page.locator(".total dd")).toHaveText("1.293 ETH");
  await event(page, "duplicate");
  await event(page, "old");
  await expect(page.locator(".total dd")).toHaveText("1.293 ETH");
  await event(page, "sold-out");
  await expect(page.getByRole("alert")).toContainText("Edição indisponível");
  await page.goto("/checkout");
  await page.getByLabel("Carteira", { exact: true }).selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Simular conexão", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Entendo/ }).check();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Uma edição está esgotada. Revise o carrinho.",
  );
});
test("pedido pendente recupera reconexão e refresh sem duplicar", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar compra simulada" })
    .dblclick();
  await expect(page).toHaveURL(/\/orders\//);
  const url = page.url();
  await control(page, "disconnect");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A arte agora faz parte de você." }),
  ).toBeVisible();
  expect(page.url()).toBe(url);
  const count = await page.evaluate(
    () => JSON.parse(localStorage.getItem("jungle.mock.v1")!).orders.length,
  );
  expect(count).toBe(1);
});
test("busca fora de ordem, resultado vazio e recuperação offline", async ({
  page,
}) => {
  await scenario(page, "out-of-order");
  await page.getByRole("textbox", { name: "Buscar NFTs" }).fill("E");
  await page.getByRole("textbox", { name: "Buscar NFTs" }).fill("Emerald Ape");
  await expect(page.locator(".nft-card")).toHaveCount(1);
  await expect(page.locator(".nft-card")).toContainText("Emerald Ape #042");
  await page.getByRole("textbox", { name: "Buscar NFTs" }).fill("inexistente");
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
  await scenario(page, "offline");
  await page.goto("/nft/2");
  await expect(page.getByRole("alert")).toHaveText(
    "Falha de conexão. Tente novamente.",
  );
  await scenario(page, "default");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Sage Nomad #009" }),
  ).toBeVisible();
});
test("avatar persiste e conflito de carteira retorna erro do servidor", async ({
  page,
}) => {
  await login(page);
  await page.getByLabel("Alterar avatar").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8i8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("img", { name: "Seu avatar" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toHaveText("Perfil atualizado.");
  await page.reload();
  await expect(page.getByRole("img", { name: "Seu avatar" })).toBeVisible();
  await page.goto("/wallets");
  await page.getByLabel("Nome da carteira").fill("Duplicada");
  await page
    .getByLabel("Endereço", { exact: true })
    .fill("0x1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("alert")).toHaveText("Carteira já cadastrada.");
});
