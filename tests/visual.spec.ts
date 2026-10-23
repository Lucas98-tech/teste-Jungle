import { test, expect } from "@playwright/test";
import { reset, login, add } from "./helpers";
test.beforeEach(async ({ page }) => {
  await reset(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
});
for (const route of ["inicio", "detalhe", "carrinho", "pagamento"])
  test(`visual ${route}`, async ({ page }) => {
    if (route === "inicio") {
      await page.goto("/");
      await expect(page.locator(".nft-card")).toHaveCount(4);
    }
    if (route === "detalhe") {
      await page.goto("/nft/1");
      await expect(
        page.getByRole("heading", { name: "Emerald Ape #042" }),
      ).toBeVisible();
    }
    if (route === "carrinho") {
      await add(page);
      await page.goto("/cart");
      await expect(page.locator(".cart-item")).toHaveCount(1);
    }
    if (route === "pagamento") {
      await login(page);
      await add(page);
      await page.goto("/checkout");
      await expect(
        page.getByRole("heading", { name: "01. Dados do colecionador" }),
      ).toBeVisible();
    }
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${route}.png`, { fullPage: true });
  });
test("tablet sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await expect(page.locator(".nft-card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
