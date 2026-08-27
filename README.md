# CITi HubSpot

Aplicação React + Vite com API Node/Express, Prisma e PostgreSQL.

## Pré-requisitos

- Docker Desktop ou Docker Engine com Docker Compose
- Git, caso o projeto seja obtido por repositório

O pnpm já é instalado e utilizado dentro das imagens Docker. Não é necessário executar `pnpm dev` no host para o fluxo completo.

## Configuração inicial

Na raiz do projeto, crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Confira principalmente estas variáveis:

```env
POSTGRES_USER=marketops
POSTGRES_PASSWORD=marketops
POSTGRES_DB=marketops
DATABASE_URL_DOCKER=postgresql://marketops:marketops@postgres:5432/marketops
```

O hostname `postgres` é o nome do serviço dentro da rede Docker. Não use `127.0.0.1` ou `localhost` em `DATABASE_URL_DOCKER`.

Para criar um usuário gerente durante o seed, preencha também:

```env
MANAGER_EMAIL=gerente@example.com
MANAGER_PASSWORD=uma-senha-local
MANAGER_NAME=Gerente
```

As integrações opcionais do Google e de e-mail podem permanecer vazias durante os testes básicos.

## Rodar tudo pelo Docker

Execute na raiz do projeto:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Na primeira execução, o Docker baixa as imagens, instala as dependências com pnpm, constrói o frontend e a API e executa as migrações do Prisma.

Abra a aplicação em:

```text
http://localhost:8443
```

Serviços disponíveis:

- Frontend: `http://localhost:8443`
- API: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

O endpoint `/` da API pode retornar HTTP 404, pois a API não possui uma rota raiz. Isso não indica que o serviço esteja parado; o frontend deve ser acessado pela porta `8443`.

## Executar o seed

Depois que os containers estiverem disponíveis, execute:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml \
  --profile seed run --rm seed
```

O seed só cria o usuário gerente se `MANAGER_EMAIL` e `MANAGER_PASSWORD` estiverem preenchidos no `.env`.

## Logs e status

Ver o status dos serviços:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

Acompanhar todos os logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

Acompanhar apenas a API:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api
```

## Parar a aplicação

Para parar os containers mantendo os dados do banco:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

Para remover também os volumes do PostgreSQL e dos uploads locais:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

O comando `down -v` apaga os dados persistidos localmente no Docker e deve ser usado apenas quando for desejado reiniciar o banco do zero.

## Desenvolvimento do frontend com hot reload

Para rodar somente o frontend com `pnpm` no host e manter a API e o PostgreSQL no Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build postgres migrate api
```

Em outro terminal:

```bash
PORT=5174 pnpm dev
```

Nesse modo, acesse `http://localhost:5174`. A API permanece em `http://localhost:3001`.

## Comandos pnpm úteis

Se o pnpm estiver instalado localmente, os principais scripts são:

```bash
pnpm install       # instala dependências
pnpm dev           # inicia o Vite localmente
pnpm build         # gera o build do frontend
pnpm build:api     # gera o build da API
pnpm typecheck     # verifica os tipos
pnpm test          # executa os testes
```

## Deploy de produção

A arquitetura de produção usa Supabase para PostgreSQL e Storage privado, Railway
para a API Express e Vercel para o frontend Vite.

### Supabase

1. Crie um projeto vazio e um usuário de banco dedicado para o Prisma.
2. Use a conexão Session Pooler na porta `5432` em `DATABASE_URL`.
3. Execute as migrações com `pnpm exec prisma migrate deploy`.
4. Execute `pnpm db:seed` uma única vez para criar o gerente e os dados iniciais.
5. Crie os buckets privados `posts` e `materials`, ambos com limite de 20 MB.

O backend usa `SUPABASE_URL` e `SUPABASE_SECRET_KEY` para enviar os arquivos e
gerar URLs assinadas. A chave secreta nunca deve ser colocada no frontend.

### Railway

O serviço da API deve usar `Dockerfile.api`. O arquivo `railway.json` já define:

- pre-deploy: `pnpm exec prisma migrate deploy`;
- start: `node dist-api/index.js`;
- healthcheck: `/health`.

Configure no Railway as variáveis do `.env.example`, incluindo `DATABASE_URL`,
`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, os segredos JWT/OAuth, as credenciais do
Gmail e `UPLOAD_DIR=/tmp/uploads`. Gere o domínio público antes de preencher
`GOOGLE_OAUTH_REDIRECT_URI` com `/api/v1/google/callback`.

### Vercel

Importe o mesmo repositório como projeto Vite, usando `pnpm build` e saída `dist`.
Configure somente a variável pública:

```env
VITE_API_URL=https://<dominio-do-railway>/api/v1
```

No Railway, defina `FRONTEND_URL` e `CORS_ORIGIN` para a URL de produção do
frontend. Não coloque no Vercel chaves do Supabase, Gmail, JWT ou OAuth.

Antes de publicar, rode `pnpm typecheck`, `pnpm test`, `pnpm build` e
`pnpm build:api`.

Para o fluxo recomendado de teste integrado, use o Docker Compose, pois ele inicia PostgreSQL, migrações, API e frontend juntos.

## Solução de problemas

### A página não abre em `localhost:8443`

Confirme que os dois arquivos Compose foram informados:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
```

O serviço `web` deve aparecer como ativo e com `127.0.0.1:8443->8080/tcp`.

### Erro de conexão com o PostgreSQL

Confira se `DATABASE_URL_DOCKER` usa o serviço `postgres` e as mesmas credenciais de `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`.

Após alterar o `.env`, recrie os containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Rebuild completo

Para reconstruir as imagens sem usar o cache:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
```
