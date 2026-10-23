import { test, expect, type Page } from "@playwright/test";
import { reset, add, checkout } from "./helpers";
async function social(
  page: Page,
  provider: "Google" | "Facebook",
  returnTo = "/profile",
) {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  await page
    .getByRole("button", { name: `Continuar com ${provider}`, exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Nenhuma senha ou autorização",
  );
  await page
    .getByRole("button", { name: `Entrar com ${provider} (demo)`, exact: true })
    .click();
  await expect(page).not.toHaveURL(/\/login/);
}
test.beforeEach(async ({ page }) => reset(page));
for (const provider of ["Google", "Facebook"] as const) {
  test(`login ${provider} preserva carrinho, sessão e retorno ao checkout`, async ({
    page,
  }) => {
    await add(page);
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
    await page
      .getByRole("button", { name: `Continuar com ${provider}`, exact: true })
      .click();
    await page
      .getByRole("button", {
        name: `Entrar com ${provider} (demo)`,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByLabel("Nome completo")).toHaveValue(
      `Colecionador ${provider}`,
    );
    await expect(page.locator(".mini-item")).toContainText("Emerald Ape #042");
    await page.reload();
    await expect(page.getByLabel("Nome completo")).toHaveValue(
      `Colecionador ${provider}`,
    );
    await checkout(page);
    await page
      .getByRole("button", { name: "Confirmar compra simulada" })
      .click();
    await expect(
      page.getByRole("heading", { name: "A arte agora faz parte de você." }),
    ).toBeVisible();
  });
}
test("cancelamento, foco, recusa e nova tentativa do login social", async ({
  page,
}) => {
  await page.goto("/login?returnTo=/profile");
  const google = page.getByRole("button", {
    name: "Continuar com Google",
    exact: true,
  });
  await google.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(google).toBeFocused();
  await page
    .getByRole("button", { name: "Continuar com Facebook", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simular recusa", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Acesso recusado.",
  );
  await expect(page).toHaveURL(/\/login/);
  await page
    .getByRole("button", { name: "Entrar com Facebook (demo)", exact: true })
    .click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(
    "facebook@jungle.test",
  );
});
test("contas Google e Facebook mantêm perfil e favoritos isolados", async ({
  page,
}) => {
  await social(page, "Google");
  await page.getByLabel("Nome completo").fill("Google Editado");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toHaveText("Perfil atualizado.");
  await page.goto("/nft/1");
  await page.getByRole("button", { name: "Adicionar aos favoritos" }).click();
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await social(page, "Facebook");
  await expect(page.getByLabel("Nome completo")).toHaveValue(
    "Colecionador Facebook",
  );
  await page.goto("/nft/1");
  await expect(
    page.getByRole("button", { name: "Adicionar aos favoritos" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await social(page, "Google");
  await expect(page.getByLabel("Nome completo")).toHaveValue("Google Editado");
  await page.goto("/nft/1");
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("login social não vincula automaticamente uma conta com e-mail igual", async ({
  page,
}) => {
  await page.goto("/register?returnTo=/profile");
  await page.getByLabel("Nome completo").fill("Conta original");
  await page.getByLabel("E-mail", { exact: true }).fill("google@jungle.test");
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.goto("/login?returnTo=/profile");
  await page
    .getByRole("button", { name: "Continuar com Google", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Entrar com Google (demo)", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "já está cadastrado",
  );
  await expect(page).toHaveURL(/\/login/);
});
