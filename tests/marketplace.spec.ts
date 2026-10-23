import { test, expect } from "@playwright/test";
import { reset, login, add, checkout, scenario, event } from "./helpers";
test.beforeEach(async ({ page }) => reset(page));
test("busca, filtros combinados, ordenação, paginação e histórico", async ({
  page,
}) => {
  await expect(page.locator(".nft-card")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Próxima", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Arte", exact: true }).click();
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.getByLabel("Ordenar por").selectOption("low");
  await expect(page.locator(".nft-card")).toHaveCount(2);
  await expect(page.locator(".nft-card").first()).toContainText(
    "Emerald Ape #042",
  );
  await page.getByRole("textbox", { name: "Buscar NFTs" }).fill("Emerald");
  await expect(page.locator(".nft-card")).toHaveCount(1);
  await expect(page).toHaveURL(/q=Emerald/);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Buscar NFTs" })).toHaveValue(
    "Emerald",
  );
  await page.goto("/?page=2");
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
  await page.goto("/?q=Sage");
  await expect(page.locator(".nft-card")).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
});
test("detalhe direto, edição indisponível, limite e NFT inexistente", async ({
  page,
}) => {
  await page.goto("/nft/1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Edição").locator("option").nth(1),
  ).toHaveAttribute("disabled", "");
  await page.getByLabel("Quantidade", { exact: true }).fill("99");
  await expect(
    page.getByRole("button", { name: "Adicionar ao carrinho" }),
  ).toBeDisabled();
  await page.goto("/nft/404");
  await expect(page.getByRole("alert")).toHaveText("NFT não encontrado.");
});
test("carrinho persiste, cupom e merge após login", async ({ page }) => {
  await add(page);
  await page.goto("/cart");
  await page.getByLabel("Quantidade de Emerald Ape #042").fill("2");
  await expect(page.locator(".total dd")).toHaveText("2.383 ETH");
  await page.getByLabel("Cupom de desconto").fill("INVALID");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("alert")).toHaveText("Cupom inválido.");
  await page.getByLabel("Cupom de desconto").fill("JUNGLE10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.locator(".total dd")).toHaveText("2.145 ETH");
  await page.reload();
  await expect(page.getByLabel("Quantidade de Emerald Ape #042")).toHaveValue(
    "2",
  );
  await login(page, "alex@jungle.test", "Jungle123!", "/cart");
  await expect(page.getByLabel("Quantidade de Emerald Ape #042")).toHaveValue(
    "2",
  );
  await page.getByRole("button", { name: "Remover Emerald Ape #042" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Seu carrinho está esperando inspiração.",
    }),
  ).toBeVisible();
});
test("compra completa e recibo imutável após atualização", async ({ page }) => {
  await login(page);
  await add(page);
  await checkout(page);
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(
    page.getByRole("heading", { name: "A arte agora faz parte de você." }),
  ).toBeVisible();
  await expect(page.locator(".total dd")).toHaveText("1.193 ETH");
  await event(page);
  await page.reload();
  await expect(page.locator(".total dd")).toHaveText("1.193 ETH");
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", {
      name: "Seu carrinho está esperando inspiração.",
    }),
  ).toBeVisible();
});
test("favorito otimista reverte falha e persiste sucesso", async ({ page }) => {
  await login(page);
  await page.goto("/nft/1");
  await scenario(page, "favorite-error");
  await page.getByRole("button", { name: "Adicionar aos favoritos" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Não foi possível atualizar o favorito.",
  );
  await expect(
    page.getByRole("button", { name: "Adicionar aos favoritos" }),
  ).toHaveAttribute("aria-pressed", "false");
  await scenario(page, "default");
  await page.getByRole("button", { name: "Adicionar aos favoritos" }).click();
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos" }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("cotação antiga bloqueada por evento Socket.IO", async ({ page }) => {
  await login(page);
  await add(page);
  await checkout(page);
  await event(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Preço ou disponibilidade atualizados" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Os valores mudaram. Revise a nova cotação e confirme novamente.",
  );
  await expect(page.getByRole("dialog").locator(".total dd")).toHaveText(
    "1.293 ETH",
  );
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "A arte agora faz parte de você." }),
  ).toBeVisible();
});
test("pagamento recusado mantém itens", async ({ page }) => {
  await login(page);
  await add(page);
  await scenario(page, "declined");
  await checkout(page);
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
});
test("timeout recupera o mesmo pedido após refresh", async ({ page }) => {
  await login(page);
  await add(page);
  await scenario(page, "timeout");
  await checkout(page);
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(page.getByRole("alert")).toContainText("Falha de conexão", {
    timeout: 10000,
  });
  await page.reload();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(
    page.getByRole("heading", { name: "A arte agora faz parte de você." }),
  ).toBeVisible();
  const count = await page.evaluate(
    () => JSON.parse(localStorage.getItem("jungle.mock.v1")!).orders.length,
  );
  expect(count).toBe(1);
});
test("perfil, senha, carteira e persistência", async ({ page }) => {
  await login(page);
  await page.getByLabel("Nome completo").fill("Alex Atualizado");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toHaveText("Perfil atualizado.");
  await page.reload();
  await expect(page.getByLabel("Nome completo")).toHaveValue("Alex Atualizado");
  await page.getByLabel("Senha atual").fill("incorreta");
  await page.getByLabel("Nova senha").fill("NovaSenha123!");
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await expect(page.getByRole("alert")).toHaveText("Senha atual incorreta.");
  await page.getByLabel("Senha atual").fill("Jungle123!");
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await expect(page.getByRole("status")).toContainText("Senha alterada");
  await page.goto("/wallets");
  await page.getByLabel("Nome da carteira").fill("Secundária");
  await page
    .getByLabel("Endereço", { exact: true })
    .fill("0x3333333333333333333333333333333333333333");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("heading", { name: "Secundária" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Secundária" })).toBeVisible();
});
test("cadastro, conflito, logout e isolamento entre usuários", async ({
  page,
}) => {
  await page.goto("/register?returnTo=/profile");
  await page.getByLabel("Nome completo").fill("Novo Colecionador");
  await page.getByLabel("E-mail", { exact: true }).fill("alex@jungle.test");
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Este e-mail já está cadastrado.",
  );
  await page.getByLabel("E-mail", { exact: true }).fill("novo@jungle.test");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page);
  await page.goto("/nft/1");
  await page.getByRole("button", { name: "Adicionar aos favoritos" }).click();
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "sam@jungle.test");
  await page.goto("/nft/1");
  await expect(
    page.getByRole("button", { name: "Adicionar aos favoritos" }),
  ).toHaveAttribute("aria-pressed", "false");
});
test("skeleton, falha REST e recuperação", async ({ page }) => {
  await scenario(page, "slow");
  await page.goto("/nft/1");
  await expect(
    page.getByRole("status", { name: "Carregando conteúdo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await scenario(page, "server-error");
  await page.goto("/nft/2");
  await expect(page.getByRole("alert")).toHaveText(
    "Serviço temporariamente indisponível.",
  );
  await scenario(page, "default");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Sage Nomad #009" }),
  ).toBeVisible();
});
test("teclado e foco no diálogo de revisão", async ({ page }) => {
  await login(page);
  await add(page);
  await checkout(page);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeFocused();
});
