# Validação da entrega

## Ambiente e comandos

- Instalação limpa: `npm ci --cache /tmp/jungle-npm --no-audit --no-fund` — passou.
- `npm run build`, `npm run typecheck` e `npm run lint` — passaram.
- Chromium instalado no sistema via `CHROMIUM_PATH=/usr/bin/chromium`. O download do Chromium Playwright foi bloqueado pelo proxy; a execução usou o Chromium real disponível.

## Lighthouse — build otimizado

Três medições por página/perfil, com mocks padrão, arte local e recursos completos. Mediana por métrica:

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Início | mobile | 94 | 100 | 100 | 100 | 2731 | 0.00002 | 101 |
| Início | desktop | 100 | 100 | 100 | 100 | 618 | 0.00001 | 0 |
| Detalhe | mobile | 92 | 98 | 100 | 100 | 3075 | 0.03474 | 105 |
| Detalhe | desktop | 100 | 98 | 100 | 100 | 683 | 0.02210 | 0 |

Todas as medianas atingem as metas do enunciado. As doze medições foram repetidas após incorporar a foto original do Emerald Ape; conteúdo e funcionalidades completos foram mantidos.

Os relatórios HTML e JSON das 12 medições estão em [lighthouse/](lighthouse/); [summary.json](lighthouse/summary.json) inclui versões, máquina, condições, execuções e medianas. Configuração reproduzível em `scripts/audit.mjs`.

Ferramentas: Node v24.19.0, Lighthouse 13.5.0, Chromium 154.0.8037.57 built on Debian GNU/Linux 13 (trixie). Ambiente: Linux 6.18.55 x64; INTEL(R) XEON(R) PLATINUM 8573C; 5 CPUs lógicas, 33 GiB RAM.

## E2E e visual

**44/44 testes passaram no build otimizado de produção**, em Chromium desktop e mobile, com verificação adicional a 768 px. Comando final:

```sh
CHROMIUM_PATH=/usr/bin/chromium PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e -- --workers=2
```

Os testes incluem compra, rejeição, recuperação por idempotência após timeout, sessão expirada e retomada, isolamento de usuários, perfil/avatar/senha/carteiras, favoritos com rollback, eventos Socket.IO de preço e estoque, versões antigas/duplicadas, reconexão de pedido pendente, carregamento, erros de rede e teclado/foco. As 8 baselines de início/detalhe/carrinho/pagamento passaram sem atualização na execução final. Duração: 2 minutos. Nenhum teste ignorado ou marcado como falha esperada.

[Relatório HTML da execução final](e2e-report/index.html). Não há traces de falha no resultado final; a configuração os retém automaticamente quando uma execução falha.

As baselines em `tests/visual.spec.ts-snapshots` foram produzidas para esta implementação e conferidas visualmente; não equivalem a aprovação contra o Figma. Relatório HTML local em `playwright-report/index.html`, traces de falha em `test-results/`.

## Vercel

- Projeto reivindicado pelo usuário: `flying-nebula-zgsq5gf`, conta `lucas-fernandes-projects1`.
- CLI oficial Vercel 65.2.0 autenticada por OAuth de dispositivo.
- Deploy de produção `dpl_7vDGUf769GGKuod7znkjoJhaS1Zh` confirmado como **READY** pela API/CLI.
- URL de produção: https://flying-nebula-zgsq5gf-lucas-fernandes-projects1.vercel.app
- A proteção foi limitada a previews (`ssoProtection.deploymentType=preview`), deixando produção pública.
- Acesso HTTP à produção agora validado: foto original servida com SHA-256 idêntico ao arquivo local, página inicial e acesso direto `/nft/1` retornando o shell SPA correto.
- A tentativa de ler https://vercel.com/get-started.md também foi bloqueada pelo proxy; não se declara leitura desse documento. Foram utilizados help e comandos da CLI oficial.
- A publicação temporária foi substituída pela publicação na conta autenticada; a URL permanente acima é a referência.

## Pendências externas

- Imagem original do Emerald Ape baixada do Google Drive e incorporada localmente em `public/art/emerald-ape.jpg`. As demais artes continuam provisórias.
- Consulta aos frames/assets originais do Figma continua bloqueada. Fidelidade pixel a pixel não está aprovada.
- A verificação de imagem e compra na URL pública está registrada na atualização abaixo.
- Na data deste deploy, o código ainda estava apenas no checkout local. O deploy foi realizado diretamente pelo checkout. O envio ao GitHub foi solicitado posteriormente pelo usuário.

## Atualização da foto do Emerald Ape

A imagem original do usuário foi incorporada ao destaque, login, card, detalhe e carrinho do Emerald Ape #042. A migração de dados locais altera apenas a referência da foto no catálogo; preserva os demais dados e os snapshots dos recibos. Build e lint passaram; 12/12 testes de foto, preservação do carrinho e layout desktop/mobile passaram. As baselines de início e detalhe foram atualizadas para a nova arte. A suíte agora tem 46 casos (os 44 anteriores e 2 testes da imagem); não se declara uma nova execução integral de 46 casos. As auditorias entregues acima já usam a imagem original.

Validação final na produção pública: **4/4 testes passaram** (foto original e compra completa, em desktop e mobile), sem falhas, em 35 segundos. Comando: `CHROMIUM_PATH=/usr/bin/chromium PLAYWRIGHT_BASE_URL=https://flying-nebula-zgsq5gf-lucas-fernandes-projects1.vercel.app npm run test:e2e -- tests/assets.spec.ts tests/marketplace.spec.ts --grep 'foto original|compra completa' --workers=1`. [Relatório HTML](e2e-public-photo/index.html).

## Segunda foto original — Ivory Baron #008

`public/art/ivory-baron.jpg` incorpora, sem edição, a segunda imagem fornecida pelo usuário. O catálogo e a migração de dados existentes usam a nova foto no Ivory Baron #008, preservando o Emerald Ape e os dados de conta/carrinho/recibos. Build e lint passaram. A execução direcionada de imagens, migração/persistência e catálogo visual passou **6/6** em desktop/mobile. [Relatório](e2e-ivory-photo/index.html). A suíte agora tem 48 casos; não foi repetida integralmente nesta troca de imagem. As auditorias Lighthouse acima foram medidas na revisão anterior, já com a foto original do Emerald Ape, antes de incorporar a foto do Ivory Baron.

## Terceira foto original — Golden Best #017

`public/art/golden-best.jpg` é a terceira foto enviada pelo usuário, incorporada sem edição ao Golden Best #017. As fotos anteriores continuam preservadas. O mapa de artes originais centraliza a referência utilizada nas fixtures e na migração do catálogo persistido; os recibos anteriores permanecem intactos. Build e lint passaram, assim como **8/8** testes direcionados de imagens, preservação do carrinho e layout desktop/mobile. As baselines de início foram atualizadas para as três fotos recebidas. [Relatório HTML](e2e-golden-photo/index.html). A suíte tem agora 50 casos; não foi repetida integralmente nesta atualização. As auditorias Lighthouse anteriores não foram repetidas nesta terceira troca de imagem.

## Quarta foto original — Sage Nomad #009

`public/art/sage-nomad.jpg` incorpora sem edição a quarta imagem do usuário. Foto aplicada ao catálogo, detalhe e carrinho do Sage Nomad #009; imagens anteriores e dados existentes preservados. Build e lint passaram. **10/10** testes direcionados de fotos, persistência/migração e catálogo visual passaram em desktop/mobile. Baselines de início atualizadas para as quatro fotos. [Relatório HTML](e2e-sage-photo/index.html). A suíte agora contém 52 casos; não foi repetida integralmente nesta troca de imagem, nem foram repetidas as auditorias Lighthouse anteriores. Publicação Vercel READY confirmada e arquivo servido publicamente comparado byte a byte com o original.

## Catálogo final: somente os quatro enviados

A pedido do usuário, removidos do catálogo os NFTs #023, #061, #072 e #088 e todas as outras fixtures sem foto enviada. Permanecem apenas Emerald Ape #042, Sage Nomad #009, Ivory Baron #008 e Golden Best #017. Migração validada para remover os itens antigos de carrinhos e favoritos, preservando contas e snapshots históricos. Build e lint passaram. A suíte completa passou **54/54 testes** no build de produção em desktop/mobile, em 2,3 minutos; baselines atualizadas para o catálogo reduzido. [Relatório HTML](e2e-four-only/index.html).

Deploy Vercel `dpl_7ddZWTg7pfCBkmAz9dX1iHEJx9PC` confirmado READY. Conferência no browser contra a URL pública confirmou catálogo/API com exatamente os IDs 1–4 e erro “NFT não encontrado” para a rota antiga `/nft/5`. Auditorias Lighthouse históricas acima não foram repetidas após essa redução do catálogo.

## Google e Facebook — autenticação simulada

Adicionados os botões no login e no cadastro, com diálogo explícito de demonstração. Perfis fictícios separados, sessão persistente, mesclagem do carrinho visitante e retorno ao fluxo anterior funcionam pela API MSW. A simulação permite cancelar, recusar e repetir; conflito de e-mail não vincula contas automaticamente. Nenhuma conta real ou credencial dos provedores é utilizada.

Build e lint passaram. A suíte completa no build otimizado passou **64/64 testes** em desktop/mobile, em 2,9 minutos, incluindo compra com cada provedor, refresh, foco do diálogo, recusa, conflito e isolamento de favoritos/perfil. As regressões visuais existentes passaram sem atualização de baselines. [Relatório HTML](e2e-social-auth/index.html).

Deploy Vercel `dpl_HJQHqiyowoMTTYnTg1GnosDFGtBC` confirmado READY. As auditorias Lighthouse históricas não foram repetidas nesta mudança na tela de autenticação.

Na URL pública da Vercel, **4/4 testes adicionais passaram**: login Google e Facebook, retorno ao checkout, carrinho preservado, recuperação após refresh e compra confirmada, em desktop e mobile. [Relatório público](e2e-social-public/index.html).
