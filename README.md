# KURIO — NFT Marketplace

Aplicação React + TypeScript com catálogo, detalhes, favoritos, carrinho, checkout, pedidos, autenticação, perfil e carteiras. Todas as compras e contas são fictícias. Não há integração blockchain ou backend privado.

**Estado da entrega:** implementação em desenvolvimento. A referência visual é a captura mobile fornecida pelo usuário. O Figma original não pôde ser aberto neste ambiente (proxy HTTP 403); fidelidade aos frames completos e aos assets originais permanece pendente. As artes SVG são substituições locais, identificadas em `ARCHITECTURE.md`. Deploy na Vercel concluído; estado READY confirmado. A foto original e o acesso direto às rotas já foram validados na URL pública.

O catálogo contém somente as quatro fotos enviadas pelo usuário: Emerald Ape #042, Sage Nomad #009, Ivory Baron #008 e Golden Best #017. A migração remove os demais NFTs de carrinhos e favoritos salvos, preservando contas e recibos históricos. A paginação continua disponível na API e URL; com quatro itens, o catálogo padrão possui uma página.

## Execução

Node 22.12+ ou 24 e npm. O lockfile está incluído.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview -- --port 4173
```

Os mocks são ativados por padrão, inclusive no build. `.env.example` descreve `VITE_MOCKS=true`. Não use `false` para avaliar a demonstração: não há servidor real alternativo. As imagens são SVG locais e não requerem rede. O site não usa serviços privados.

## Contas fictícias

| Conta | Senha |
|---|---|
| `alex@jungle.test` | `Jungle123!` |
| `sam@jungle.test` | `Jungle123!` |

Os botões **Continuar com Google** e **Continuar com Facebook** estão disponíveis no login e no cadastro. São fluxos de demonstração: um diálogo informa o perfil fictício usado, permite cancelar, simular uma recusa e tentar novamente. Não há conexão com contas reais ou solicitação de credenciais desses serviços. A primeira entrada cria `google@jungle.test` ou `facebook@jungle.test` com carteira fictícia; a senha local de demonstração também é `Jungle123!`. Os perfis são separados e a sessão e o carrinho persistem após refresh.

O cadastro também funciona. Use dados fictícios. Senhas são armazenadas como hash SHA-256 com salt exclusivo para a simulação, nunca em claro. Isso não substitui autenticação de produção.

Cada conta inicial tem uma carteira EVM fictícia. Novas carteiras devem ter prefixo `0x` e 40 caracteres hexadecimais. Carteira e rede selecionadas precisam ser compatíveis.

## Cenários

Abra **Cenários da demonstração** ao final da página. A seleção persiste após refresh. **Restaurar dados** recria todos os usuários, catálogo, sessão, carrinhos, favoritos, carteiras, cupons, pedidos e chaves de idempotência.

| Cenário | Como avaliar |
|---|---|
| `default` | Navegue, adicione NFT, entre e finalize uma compra |
| `empty` | Catálogo sem resultados |
| `slow` | Latência de 1,8 s; skeletons no catálogo, detalhe e resumo |
| `out-of-order` | Busca de uma letra demora 1,4 s; as demais, 100 ms. Digite rapidamente; a consulta antiga não deve substituir a nova |
| `offline` | Falha de transporte em todas as APIs de negócio |
| `server-error` | HTTP 503 e recuperação pelo botão de nova tentativa |
| `expired` | Sessão invalidada, retorno ao login |
| `favorite-error` | Mutation de favorito falha com rollback |
| `price-change` / `sold-out` | Evento automático após 2 s ou botões de evento para disparo manual |
| `timeout` | Pedido criado antes do timeout de 5 s do Axios; refresh ou nova tentativa recupera o mesmo pedido |
| `declined` | Pedido passa por pendente e termina recusado, preservando o carrinho |

Cupom válido: `JUNGLE10` (10%). `EXPIRED` produz erro de cupom expirado; outros códigos produzem erro de cupom inválido.

Os endpoints de controle `/api/mock/*` são interceptados por MSW e ficam disponíveis apenas quando os mocks estão ativos. Veja `docs/API.md`. Não há setters de negócio alternativos nos componentes.

## E2E e visual

```sh
npx playwright install chromium
npm run test:e2e
npm run test:visual
# Atualizar baselines somente após revisar uma mudança visual intencional:
npm run test:visual -- --update-snapshots
```

Em ambientes com Chromium já instalado:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Para testar um preview de produção já iniciado, use `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e`.

Projetos Chromium desktop (1440 px) e mobile (390 px), mais verificação de overflow a 768 px. Cada teste usa um contexto isolado e reset completo. Execução completa mais recente no build de produção: **64 testes passaram**; relatório em `docs/e2e-social-auth/index.html`. Relatório entregue em `docs/e2e-report/index.html`; relatório de cada nova execução em `playwright-report/index.html`; traces e screenshots de falhas em `test-results/`. As baselines em `tests/visual.spec.ts-snapshots/` são arquivos da entrega. São regressões contra a implementação, não prova de fidelidade ao Figma.

## Lighthouse

Com o build otimizado e preview em execução:

```sh
npm run build
npm run preview -- --port 4173
CHROMIUM_PATH=/usr/bin/chromium npm run audit
```

O script versionado executa três medições para início e detalhe, mobile e desktop. Registra relatórios HTML/JSON, medianas por categoria, LCP, CLS, TBT, versões e condições em `reports/lighthouse/`. Relatórios HTML/JSON da execução realizada também estão em `docs/lighthouse/`. Veja `docs/VALIDATION.md` para resultados e limitações.

## Deploy na Vercel

Configuração em `vercel.json`: preset Vite, `npm run build`, saída `dist`, fallback SPA e worker MSW sem cache. Não exige variáveis secretas. Mantenha `VITE_MOCKS=true` e HTTPS para o Service Worker.

Importe `Lucas98-tech/teste-Jungle` na Vercel, ou publique o checkout pela CLI autenticada:

```sh
npx vercel --prod
```

A publicação deve ser feita a partir da mesma revisão validada. Após publicar, confira acesso direto e refresh em `/nft/1`, `/cart`, `/checkout` e `/profile`, e execute uma compra com Socket.IO. **Deploy realizado:** https://flying-nebula-zgsq5gf-lucas-fernandes-projects1.vercel.app — Vercel READY confirmado; foto original e fallback de rotas validados publicamente.

Código-fonte: https://github.com/Lucas98-tech/teste-Jungle. O deploy existente foi realizado pela CLI a partir deste checkout.

## Organização

- `src/pages`: fluxos de descoberta, conta e compra.
- `src/components/ui`: Button e Dialog no padrão shadcn/ui, com CVA, Slot e Radix.
- `src/lib`: contratos, precisão monetária, Axios, Query e sessão/socket.
- `src/mocks`: fixtures persistentes e handlers REST/Socket.IO MSW.
- `public/art`: artes locais substitutas.
- `tests`: E2E e regressão visual.
- `scripts/audit.mjs`: auditoria Lighthouse reproduzível.
- `docs/API.md`: contratos e cenários.
- `ARCHITECTURE.md`: decisões, cache, reconciliação e limitações.
