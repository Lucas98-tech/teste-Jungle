import { expect, type Page } from "@playwright/test";
export async function reset(page: Page, scenario = "default") {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Encontre sua próxima conexão." }),
  ).toBeVisible();
  await page.evaluate(async (scenario) => {
    await fetch("/api/mock/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
  }, scenario);
  await page.reload();
}
export async function login(
  page: Page,
  email = "alex@jungle.test",
  password = "Jungle123!",
  returnTo = "/profile",
) {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
export async function add(page: Page, id = "1") {
  await page.goto(`/nft/${id}`);
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "NFT adicionado" }),
  ).toBeVisible();
}
export async function checkout(page: Page) {
  await page.goto("/checkout");
  await page.getByLabel("Carteira", { exact: true }).selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Simular conexão", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Entendo/ }).check();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
export async function scenario(page: Page, scenario: string) {
  await expect(page.locator("html")).toHaveAttribute("data-mocks", "ready");
  await page.evaluate(async (scenario) => {
    await fetch("/api/mock/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
  }, scenario);
}
export async function event(page: Page, kind = "price") {
  await expect(page.locator("html")).toHaveAttribute("data-mocks", "ready");
  await page.evaluate(async (kind) => {
    await fetch("/api/mock/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
  }, kind);
}
