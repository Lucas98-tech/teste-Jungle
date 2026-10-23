# Contratos REST e eventos

Base `/api`, JSON. O Axios é o cliente da aplicação. MSW intercepta a rede no browser. Definições TypeScript em `src/lib/contracts.ts`. Dinheiro sempre string decimal ETH, quantidades inteiras. Erros: `{ message: string, fields?: Record<string,string> }`.

## Recursos

| Método e caminho | Entrada | Saída |
|---|---|---|
| `POST /session/register` | `{name,email,password}` | `User` e sessão; 409 e-mail existente, 422 validação |
| `POST /session/social` | `{provider:"google"\|"facebook",outcome:"allow"\|"deny"}` | `User` fictício e sessão; 403 recusa, 409 e-mail já associado a outra conta, 422 provedor/resultado inválido |
| `POST /session/login` | `{email,password}` | `User`; 401 credenciais incorretas |
| `GET /session` | — | `User` ou `null` |
| `DELETE /session` | — | `{ok:true}` |
| `GET /nfts` | `q`, `category` (lista por vírgula), `sort=featured\|low\|high`, `page`, `available=true` | `{items:NFT[],total:number}`, página de 8 |
| `GET /nfts/:id` | — | `NFT`; 404 inexistente |
| `GET /favorites` | sessão | `string[]` |
| `POST /favorites/:id` | `{}` e sessão | `string[]` |
| `DELETE /favorites/:id` | sessão | `string[]` |
| `GET /cart` | sessão opcional | `Quote` |
| `POST /cart` | `{nftId,quantity}` | `Quote`, quantidade somada ao item |
| `PATCH /cart/:id` | `{quantity}` | `Quote`, quantidade absoluta; 409 disponibilidade |
| `DELETE /cart/:id` | — | `Quote` |
| `POST /quote` | `{coupon?:string}` | `Quote`; cupom vazio remove, omitido mantém; 422 cupom, 409 estoque |
| `POST /orders` | `{fingerprint,walletId,network}`, header `Idempotency-Key` | `Order` pendente/terminal; 201 novo, 200 repetição; 409 cotação ou chave conflitante |
| `GET /orders/:id` | sessão | `Order` do usuário; 404 inexistente ou outro proprietário |
| `GET /profile` | sessão | `User` |
| `PATCH /profile` | `{name,email,avatar}` | `User`; avatar data URL PNG/JPEG/WebP; 422 validação, 409 conflito |
| `POST /profile/password` | `{current,password}` | `User`; 422 senha atual ou nova inválida |
| `GET /wallets` | sessão | `Wallet[]` |
| `POST /wallets` | `{name,address,network,primary}` | `Wallet[]` |
| `PATCH /wallets/:id` | mesmos campos | `Wallet[]`; 409 duplicada, 422 formato, 404 inexistente |

Favoritos, pedidos, perfil e carteiras exigem sessão: HTTP 401. O endpoint de pedido verifica propriedade e nunca entrega pedidos de outro usuário. Recursos sem operação correspondente retornam erro. Falhas transitórias: 503; cenário offline: erro de rede MSW.

## Modelos

- `NFT`: id, name, artist, category, price (string), stock (inteiro), version, image, edition.
- `Quote`: items (`nftId`, `quantity`, snapshot `nft`), subtotal, discount, fee, total, fingerprint, coupon.
- `Order`: id, userId, status (`pending|confirmed|declined`), quote (snapshot), version, transaction (fictícia), createdAt.
- `Wallet`: id, name, address, network (`Ethereum|Polygon`), primary.
- `User`: id, name, email, avatar. Hash e salt não saem da camada de mocks.

No checkout, `X-Require-Session: true` exige sessão válida também na cotação; cupons do carrinho visitante continuam permitidos.

Cotação: soma de preço × quantidade, desconto de 10% para `JUNGLE10` e taxa de `0.003 ETH` para carrinho não vazio. Aritmética em wei via BigInt (18 casas), conversão apenas nas bordas. Nenhum cálculo financeiro usa ponto flutuante.

Idempotência: chave escopada por usuário; conteúdo idêntico recupera o mesmo pedido, conteúdo diferente retorna 409. A tentativa é mantida em sessionStorage antes da requisição; o servidor simulado persiste a chave antes de atrasar a resposta. Reenvio após timeout/refresh recupera o pedido. O recibo sempre lê o snapshot persistido.

## Tempo real

Cliente `socket.io-client` em `wss://jungle.mock`, transporte exclusivamente WebSocket, caminho `/socket.io/`. O handler usa `ws.link("wss://jungle.mock")`, pois MSW normaliza e remove o prefixo Socket.IO na correspondência. MSW está fixado em 2.11.6 para execução reproduzível. MSW `ws.link` + `@mswjs/socket.io-binding` decodificam/codificam Engine.IO e Socket.IO. Não existe backend nesse domínio; a interceptação deve iniciar antes do cliente.

| Evento | Payload |
|---|---|
| `nft.updated` | `{id,resourceId,version}` |
| `order.updated` | `{id,resourceId,version,userId}` |

Eventos são sinais para reconciliar com REST, não fontes de valores financeiros. O cliente ignora versões repetidas/antigas por recurso e eventos privados de outro usuário. Subscriptions são encerradas em logout/troca de sessão e desmontagem. A conexão ou reconexão invalida recursos ativos. Pedidos pendentes também consultam REST a cada 1,5 s, permitindo recuperação durante perda do socket e refresh.

Limites: simulação em um browser/origem; sem salas, namespaces adicionais, polling HTTP Socket.IO, múltiplos servidores ou sincronização entre navegadores. Sem blockchain. Heartbeat Engine.IO local a cada 20 s; o transporte continua passando por socket.io-client.

## Controles determinísticos dos mocks

Todos são `POST`, JSON, e contornam somente os cenários de falha para possibilitar recuperação:

- `/mock/reset {scenario?:string}`: restaura integralmente as fixtures.
- `/mock/scenario {scenario:string}`: define cenário.
- `/mock/expire {}`: invalida sessão.
- `/mock/event {kind:'price'|'sold-out'|'duplicate'|'old'}`: mutação do primeiro item do carrinho (ou NFT 1), persistência e emissão Socket.IO; duplicate/old reemitem a última identidade/versão sem mudar REST.
- `/mock/disconnect {}`: fecha o WebSocket mock; o cliente reconecta e reconcilia via REST.

Apenas a camada MSW modifica banco e emite eventos. A UI chama os endpoints de controle via Axios. Testes usam os mesmos endpoints via fetch no browser para preparar/disparar cenários.

## Login social de demonstração

Google e Facebook utilizam `POST /session/social` via Axios e os mesmos mecanismos de sessão, mesclagem de carrinho e limpeza de cache do login por senha. As identidades são estáveis e distintas (`social-google` e `social-facebook`); contas existentes com o mesmo e-mail não são vinculadas automaticamente. `deny` retorna 403 sem criar sessão ou perfil. O diálogo permite cancelar sem requisição e informa explicitamente que não há autenticação OAuth real. Campos, contas, carteiras e senhas são fictícios; nenhuma credencial de Google/Facebook é coletada ou exigida.
