# Arquitetura e decisões

## Separação

React renderiza contratos tipados; páginas chamam Axios e TanStack Query. Os handlers MSW concentram regras de estoque, cupom, cotação, sessão e pedido. Não há respostas fictícias nem branches de negócio mock nos componentes. Os controles de demonstração apenas requisitam os handlers. O estado do mock é persistido em localStorage; a API não transmite hash/salt das contas.

TanStack Router define todas as rotas e valida parâmetros da URL. Guards consultam a sessão REST antes das rotas privadas. Catálogo inclui busca, categorias combináveis, disponibilidade, ordenação e página na URL. Mudança de filtro reinicia a página; refresh e histórico preservam a seleção.

## Cache e concorrência

Query: staleTime 20 s, refetch ao foco, no máximo um retry de consulta em erro de rede/5xx, nenhum retry automático de mutation. Chaves do catálogo incluem parâmetros completos; perfil, carteiras, favoritos, carrinho e pedidos incluem usuário. AbortSignal passa ao Axios para cancelar consultas obsoletas. Mudança de sessão cancela consultas e remove caches privados antes de propagar o novo usuário. O cache da sessão permanece observado e recebe a resposta atualizada.

Favoritos têm atualização otimista: cancelamento, snapshot do cache, alteração imediata, rollback em falha e invalidação ao finalizar. Não é necessário descartar uma ação válida por falha de uma consulta anterior.

Eventos possuem identidade e versão. O cliente desconsidera versões iguais ou menores que as já observadas e reconcilia recursos pela API. Listeners são removidos e a conexão fechada na troca de identidade. Eventos não alteram snapshots dos recibos. Após reconnect, invalidam-se as consultas ativas; pedido pendente usa polling adicional, sem criar novas compras.

## Carrinho e compra

Carrinho visitante tem chave `guest`; contas têm carrinhos separados. Login mescla o visitante à conta, soma quantidades limitadas ao estoque e limpa a origem. Logout não expõe o carrinho da conta a visitantes ou outras contas. Falha/recusa preserva itens; confirmação subtrai somente quantidades compradas do carrinho daquele usuário.

Cotação é autoridade financeira: strings decimais em transporte, BigInt em wei nos mocks, revisão antes do envio e revalidação imediatamente antes da criação. Fingerprint cobre IDs, quantidade, versão do NFT, cupom e valores. Mudanças exigem nova confirmação explícita. Pedido é criado com chave de idempotência persistida por tentativa, inclusive em timeout; recibo só aparece como confirmado após resposta/evento da simulação.

Pedidos terminais não voltam a pendente. O status pendente é restaurado após refresh e retomado a partir da data persistida. Não há transações reais ou links falsamente funcionais para explorers.

## Sessão e formulários

Sessão simulada expira em 1 hora e é verificada a cada 30 s, ao foco e em chamadas privadas. HTTP 401 limpa dados privados e inicia retomada pelo login. A URL de retorno é interna. O contexto do carrinho e tentativa de pedido persistem; não se limpam itens por falha. As senhas fictícias usam SHA-256 com salt exclusivo. Não é solução de segurança para produção, apenas simulação local.

Validação nativa para e-mail, obrigatoriedade, limites e padrões; servidor simulado repete validações e retorna conflitos. Diálogo Radix mantém foco, Escape e retorno ao botão de revisão. Mensagens de atualização usam status/alert; avisos de preço também entram no diálogo para leitores de tela enquanto o restante da página está inerte.

## Visual e assets

A direção visual foi corrigida a partir da fotografia enviada pelo usuário: marca KURIO, marrons escuros, amarelo/âmbar, cards de macacos, botões de compra arredondados e navegação fixa inferior no mobile. O arquivo Figma não pôde ser consultado por bloqueio HTTP 403 do proxy; a captura não contém medidas e assets exportáveis. **Não há declaração de fidelidade pixel a pixel.**

`public/art/emerald-ape.jpg` é a imagem original fornecida pelo usuário via Google Drive (400 × 400, JPEG), usada no destaque, login e Emerald Ape #042. `public/art/ivory-baron.jpg` é a segunda foto original enviada pelo usuário, usada no Ivory Baron #008 (400 × 400, JPEG). `public/art/golden-best.jpg` é a terceira foto original fornecida pelo usuário, usada no Golden Best #017 (400 × 400, JPEG). `public/art/sage-nomad.jpg` é a quarta foto original fornecida pelo usuário, usada no Sage Nomad #009 (400 × 400, JPEG). `public/art/*.svg` são artes vetoriais substitutas para os demais NFTs; não são os arquivos originais do Figma. Tipografia monospace usa fontes do sistema. As substituições permanecem pendentes de revisão com o arquivo original. Componentes Button/Dialog seguem o padrão shadcn/ui com CVA, Slot e primitivas Radix. Tailwind é compilado pelo plugin Vite e complementado pelo tema CSS.

Layout contempla 390, 768 e 1440 px. Contraste e foco recebem ajustes próprios. Skeletons mantêm espaço e respeitam reduced motion. Elementos sem implementação não simulam sucesso; logins sociais e explorer não são apresentados como serviços ativos.

## Limitações conhecidas

- Acesso ao Figma e assets originais ainda necessário para encerrar fidelidade visual e frames desktop.
- Backend MSW por browser, sem persistência compartilhada ou garantias de consistência entre abas simultâneas.
- Uma edição comprável por NFT; a edição original é explicitamente indisponível.
- UI não inclui recuperação de senha por e-mail. Login Google/Facebook é uma simulação explícita com contas distintas, cancelamento e recusa, sem OAuth ou conexão real com os provedores.
- Deploy autenticado na Vercel concluído (READY). Acesso HTTP à foto original e fallback SPA da produção validados.
- SHA-256 local não deve ser usado como serviço real de autenticação.

Consulte `docs/VALIDATION.md` para evidências executadas e pendências. Não confundir código implementado, teste executado e deploy validado.

## Catálogo reduzido a pedido do usuário

Após receber as quatro fotos originais, o usuário pediu que apenas esses NFTs permanecessem. Fixtures e catálogo persistido passaram a conter somente IDs 1–4. A migração remove referências antigas de todos os carrinhos e favoritos, preservando dados de conta, preços/estoque dos itens restantes e snapshots de pedidos. Pedidos pendentes com itens removidos são recusados na simulação em vez de acessar um NFT inexistente. Recibos terminais históricos não são reescritos. O catálogo padrão agora tem uma página; a infraestrutura de paginação e seus parâmetros continuam disponíveis. Os SVGs antigos não são apresentados na loja. Esta preferência posterior substitui a variedade de fixtures prevista no enunciado inicial.

## Opções Google e Facebook

As duas opções estão no login e no cadastro, com ícones locais, botões acessíveis e diálogo Radix com controle/retorno de foco. O diálogo identifica a conta fictícia antes de entrar. A simulação passa por Axios e MSW, cria ou recupera identidade estável do provedor, persiste sessão, mescla o carrinho visitante e usa a mesma limpeza de cache e reconexão Socket.IO da autenticação comum. Recusa retorna 403; cancelamento não faz login. Conflito de e-mail retorna 409 sem vincular ou expor a conta preexistente. Contas de Google, Facebook e login comum têm carrinhos, favoritos e perfis isolados. Esta implementação mantém o requisito inicial de autenticação simulada, sem integrar serviços OAuth reais.
