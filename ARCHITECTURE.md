# Arquitetura por feature

- `src/app` compõe sessão, shell e navegação; não contém regras de domínio nem chamadas HTTP.
- `src/features/<feature>` contém a tela, estado, mapeadores e cliente da feature. Features dependem apenas de `src/shared`.
- `src/shared` contém infraestrutura e modelos realmente comuns. Não pode importar uma feature.
- `server/src/features/<feature>/router.ts` é o ponto HTTP do domínio. Infraestrutura Express, Prisma e autenticação fica fora das features.
- Endpoints e schema Prisma são contratos estáveis: mudanças de produto exigem uma alteração explícita de contrato e migração.

## Segurança e execução local

- Tokens de acesso, state OAuth, assinatura de arquivos e criptografia Google têm finalidades e secrets separados em produção. `JWT_SECRET` é apenas fallback local.
- Uploads são armazenados como referências `file:<categoria>/<nome>` e entregues por `/api/v1/files` com URL assinada; `/uploads` nunca é público.
- `pnpm db:seed` é explícito e só cria gerente quando `MANAGER_EMAIL` e `MANAGER_PASSWORD` forem informados juntos.
- Para converter dados antigos, execute `pnpm db:normalize-file-references` e `pnpm db:secure-google-tokens` depois da migração.
- O Compose base é fechado e exige configuração de produção. Para uso local: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`.
- Para popular a base local via Compose: `docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile seed run --rm seed`.
