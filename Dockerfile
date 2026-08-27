FROM node:22.22-alpine AS base

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN pnpm db:generate && pnpm build && pnpm build:api

FROM build AS api-deps
RUN pnpm prune --prod

FROM build AS migrate
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM base AS api
ENV NODE_ENV=production
COPY --from=api-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist-api ./dist-api
COPY --from=build /app/prisma ./prisma
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 3001
CMD ["node", "dist-api/index.js"]

FROM nginx:1.27-alpine AS web
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's|pid        /run/nginx.pid;|pid        /tmp/nginx.pid;|' /etc/nginx/nginx.conf
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
