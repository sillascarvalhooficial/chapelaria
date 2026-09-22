# Ateliê do Chapéu — site + painel admin

Projeto novo, separado da linha OAK Delivery — reaproveita a mesma arquitetura técnica (Node.js +
Express, testada e madura nos projetos OAK Control/Gestão), mas é um negócio diferente: um chapeleiro
artesão (modelagem, restauração, customização de chapéus) que também intermedia a venda de chapéus de
clientes.

## Contexto e decisões (2026-09-20, parte 2) — hospedagem 100% gratuita

Decisão: publicar pagando **só o domínio**, sem custo mensal de hospedagem. Isso mudou a arquitetura
de armazenamento, porque nenhum provedor free tier em 2026 oferece disco persistente de graça:

- **Banco de dados**: trocado de `node:sqlite` (arquivo local) pra **Turso** (libSQL hospedado, via
  `@libsql/client`) — mesma linguagem SQL, free tier generoso (5GB, sem cartão). Em desenvolvimento
  local, sem `TURSO_DATABASE_URL` configurado, continua usando um arquivo local automaticamente (zero
  configuração pra rodar na sua máquina).
- **Fotos (achados e antes/depois)**: trocado de disco local pra **Cloudinary** (free tier, sem
  cartão). As URLs das imagens no banco agora são links completos do Cloudinary, não caminhos locais.
- **Hospedagem do site+painel**: **Render** (plano free, 750h/mês) — precisa das duas contas acima
  porque o disco do Render free não é persistente (reinicia sozinho e apagaria banco/fotos locais).

Veja a seção "Como publicar de graça" mais abaixo pro passo a passo completo.

## Contexto e decisões (2026-09-20)

- O conteúdo do arquivo "Eldorado Chapéus" que serviu de referência é **só inspiração visual**
  (preto/dourado, barra superior de contato, header com logo, menu, grade de produtos, rodapé em
  colunas) — não é o cliente real, e o conteúdo aqui é placeholder ("Ateliê do Chapéu"), pra trocar
  quando houver um cliente de verdade.
- **Sem carrinho de compras** — diferente do OAK. O fluxo é: ver o site → clicar em "falar no
  WhatsApp" (por item do mural, ou pelo assistente flutuante) → conversa continua direto no WhatsApp.
- **Hero/destaque principal = o serviço** (modelagem, curva de aba, ajuste de copa, goma,
  customização, limpeza), com a seção "Antes e Depois" como prova visual — decisão tomada porque o
  serviço está sempre disponível, diferente do mural de achados que depende de ter peça em estoque.
- **Mural de Achados** é a única listagem de "produtos" do site (não existe catálogo separado por
  categoria como no OAK) — cada achado tem foto, nome, descrição, categoria/tipo e preço. Quando não
  há nenhum achado ativo, o site mostra automaticamente a frase configurável em "Dados do ateliê"
  (padrão: *"O próximo grande achado está sendo negociado... volte em breve!"*).
- **Assistente flutuante** é mais simples que o OAK Assist: não tenta responder perguntas — só
  transforma o que a pessoa digitou num link do WhatsApp pronto pra enviar (com sugestões rápidas de
  mensagem). Sem regras de reconhecimento de intenção, sem custo de API.

## Estrutura

```
index.html                        site público
assets/css/style.css               visual preto/dourado inspirado na referência
assets/js/config.js                dados do ateliê (gerado pelo painel — não editar à mão)
assets/js/servicos.js              lista de serviços (gerado pelo painel)
assets/js/antesDepois.js           galeria antes/depois (gerado pelo painel)
assets/js/achados.js               mural de achados (gerado pelo painel)
assets/js/app.js                   lógica de renderização do site
assets/js/assistente.js            widget flutuante "falar no WhatsApp"
admin-backend/                     painel do dono (Node + Express + Turso/libSQL + Cloudinary)
```

Fotos de achados e antes/depois não ficam mais em `assets/img/` — vão pro Cloudinary e o banco guarda
a URL completa (ver seção de hospedagem acima).

## Painel do dono

6 seções: Dados do ateliê, Horários, Serviços, Antes e Depois (2 fotos por item), Mural de Achados
(CRUD completo com foto/categoria/preço), Trocar senha. Mesma filosofia dos projetos OAK: qualquer
alteração regenera os arquivos públicos na hora.

**Diferencial testado nesta entrega:** o servidor agora gera os arquivos públicos (`config.js`,
`servicos.js` etc.) automaticamente no primeiro boot, mesmo antes de qualquer save no painel — bug
que existia inicialmente (site quebraria até o primeiro salvamento) e foi corrigido e testado antes
de entregar.

## Como rodar

```
cd admin-backend
npm install
node server.js
```
Requer **Node.js 18+**. Sem nenhuma variável de banco/imagem configurada no `.env`, roda 100% local
(banco em arquivo, upload de fotos indisponível até configurar o Cloudinary).

- Site: `http://localhost:5700/`
- Painel: `http://localhost:5700/admin` (login padrão: `admin` / senha em `.env` — troque na seção 6
  do painel antes de entregar pra um cliente real)

## Como publicar de graça (só paga o domínio)

1. **Turso** (banco de dados) — crie uma conta grátis em turso.tech (sem cartão), crie um banco:
   ```
   turso db create atelie-chapeu
   turso db show atelie-chapeu --url        # -> TURSO_DATABASE_URL
   turso db tokens create atelie-chapeu     # -> TURSO_AUTH_TOKEN
   ```
   **Pegadinha da interface web do Turso** (se for criar pelo site em vez do CLI): a barra lateral
   "Databases" mistura **grupos** (região/cluster) com bancos de verdade. Um grupo vazio mostra "Get
   started and create your first database" — clique em "Create Database" *dentro* daquele grupo pra
   criar o banco de verdade. A URL fica no formato
   `libsql://<nome-do-banco>-<sua-org>.<região>.turso.io` (ex:
   `libsql://atelie-chapeu-suaorg.aws-us-east-1.turso.io`), visível na página do banco depois de criado.
2. **Cloudinary** (fotos) — crie uma conta grátis em cloudinary.com (sem cartão) e copie os 3 valores
   do "Product Environment Credentials" do dashboard (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`).
3. **Render** (hospedagem) — crie uma conta grátis em render.com, novo "Web Service" apontando pro
   repositório, root directory `admin-backend`, build `npm install`, start `node server.js`. Em
   "Environment", cole todas as variáveis do `.env` (inclusive as do Turso e Cloudinary do passo 1 e
   2, mais `SESSION_SECRET` novo e `ADMIN_PASS` novo, e `NODE_ENV=production`).
4. **Domínio** — compre onde preferir (registro.br pra `.com.br`, ou Namecheap/Cloudflare pra `.com`)
   e aponte pro Render seguindo as instruções de "Custom Domain" nas configurações do Web Service.

Sem os passos 1 e 2, o site sobe mas **quebra ao reiniciar** (o Render free apaga o disco local
periodicamente) e o **upload de fotos falha** — o servidor avisa isso no log de boot se alguma
credencial estiver faltando.

## Testado nesta entrega
- Site e painel abertos e navegados de verdade num navegador (Chromium via Playwright, com
  screenshots) — não só a API por trás
- Boot limpo gera os 4 arquivos públicos automaticamente (sem precisar salvar nada primeiro)
- Login (com a senha mestre configurada), CRUD de serviços (criar e remover testado ponta a ponta
  contra o banco Turso/libSQL) e navegação pelas 6 seções do painel
- Mural de achados e "Antes e Depois" vazios → confirmado que a seção de Antes e Depois (e o botão
  "Ver antes e depois" do hero) somem sozinhos quando não há item ativo, e o Mural mostra a frase de
  fallback configurável
- Migração de `node:sqlite` pra `@libsql/client` (Turso) testada localmente em modo arquivo — mesmos
  dados, mesmo comportamento, zero erros no console
- Sintaxe de todos os arquivos JS verificada (`node --check`)

- Turso (banco na nuvem) e Cloudinary (fotos) configurados com contas reais e testados de ponta a
  ponta: login, leitura/escrita de serviços contra o banco remoto, upload de foto de achado (parou de
  verdade em `res.cloudinary.com`) e remoção (achado + foto no Cloudinary) — tudo sem erros.

## Status (2026-09-21) — publicado e em produção

Projeto entregue pro cliente real **Queiroz Hats** (`queirozhats.com.br`). Site, painel, banco (Turso),
imagens (Cloudinary) e domínio próprio testados de ponta a ponta em produção, não só localmente.

- Site no ar: **https://www.queirozhats.com.br** (também responde em `https://chapelaria.onrender.com`)
- Conteúdo real cadastrado (nome, logo, WhatsApp, serviços, fotos) — não é mais placeholder
- Painel admin testado em produção (login, CRUD, upload de foto real pro Cloudinary)

## Lições aprendidas nesta publicação (pra não repetir)

Problemas que custaram tempo real nesta entrega — documentados pra não cair de novo neles num próximo
projeto com essa mesma stack (Render + Turso + Cloudinary + registro.br):

- **Render "Root Directory" derruba o auto-deploy silenciosamente.** Se o serviço tem Root Directory
  configurado (ex: `admin-backend`), commits que só mexem em arquivos **fora** dessa pasta (CSS,
  imagens, `index.html` na raiz do repo) **não disparam deploy automático** — sem erro, sem aviso,
  simplesmente não builda. Sintoma: alguns commits sobem sozinhos (os que tocam `admin-backend/`),
  outros exigem sempre "Manual Deploy". **Fix definitivo**: deixar Root Directory em branco e usar
  `cd admin-backend && npm install` / `cd admin-backend && node server.js` como Build/Start Command.
  Depois disso, todo commit dispara deploy automático de verdade.
- **Sessão de login "funciona" local mas não persiste em produção atrás de proxy (Render/Heroku/etc).**
  Com `cookie.secure: true` (ligado por `NODE_ENV=production`) e o Express não sabendo que está atrás
  de um proxy HTTPS, o cookie de sessão não é enviado de volta — login retorna 200 mas a sessão nunca
  gruda, te jogando de volta pro login a cada request. **Fix**: `app.set('trust proxy', 1)` logo após
  criar o `app`, antes do middleware de sessão.
- **Interface web do Turso mistura "grupos" (região/cluster) com bancos de verdade** na mesma lista —
  um grupo vazio mostra "Get started and create your first database"; é preciso clicar em "Create
  Database" *dentro* do grupo. Um token de **grupo** funciona pra qualquer banco daquele grupo.
- **registro.br pode dizer "sucesso" e não publicar o registro de verdade.** O painel "Configurar Zona
  DNS" mostrou os registros A e CNAME corretamente e confirmou "Zona DNS atualizada com sucesso", mas
  consultando o servidor autoritativo (`a.auto.dns.br`) direto — via `nslookup` e via DNS-over-HTTPS do
  Cloudflare (`cloudflare-dns.com/dns-query`) — o registro `A` não retornava resposta e o `CNAME` de
  `www` dava **NXDOMAIN**, mesmo depois de mais de 3h e de apagar/recriar os registros. Não era cache
  nem propagação normal (propagação de DNS do próprio registro.br costuma ser quase instantânea). Só
  resolveu depois de abrir um chamado técnico pra **hostmaster@registro.br** descrevendo exatamente
  esses testes (o problema era do lado deles). Detalhe da interface: o campo "Nome" **não aceita "@"**
  pro domínio raiz — deixar em branco (ele já monta como `dominio.com.br` sozinho).
- **Cache de preview de link (WhatsApp/redes sociais) não atualiza sozinho.** Sem tags Open Graph
  (`og:title`, `og:description`, `og:image`), apps como WhatsApp adivinham a partir de `<title>` e
  `<meta name="description">` — e, uma vez que alguém compartilha o link, o preview fica em cache no
  app por dias, mesmo depois de corrigir o site. Fix: declarar `og:*` explicitamente; pra forçar
  atualização de um link já compartilhado, usar o Facebook Sharing Debugger
  (developers.facebook.com/tools/debug/) e clicar "Scrape Again".
- **Foto de celular como logo geralmente vem com "sujeira".** A primeira versão da logo era um print
  de galeria do celular (barra de status, botões do app, margem preta grande ao redor da arte) — precisou
  recortar a UI do celular e aparar o excesso de fundo (`sharp().trim()` não funciona bem quando o
  fundo não é uniforme por causa da UI; recorte manual da área + trim resolveu).

## Próximos passos possíveis (não urgente)
- Trocar `SESSION_SECRET` e a senha do painel de novo se este projeto for reaproveitado como base pra
  outro cliente (cada instalação devia ter as suas).
- Considerar `Health Check Path` (`/`) nas configurações do Render pra reduzir instabilidade durante
  deploys (opcional, sem problema conhecido até aqui).
