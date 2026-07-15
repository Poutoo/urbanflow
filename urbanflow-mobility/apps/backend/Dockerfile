# syntax=docker/dockerfile:1
# Build à lancer depuis la racine du monorepo (urbanflow-mobility/) :
#   docker build -f apps/backend/Dockerfile -t urbanflow-backend .

FROM node:20-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# --- deps : installe tout le workspace (nécessaire pour résoudre les packages internes) ---
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

# --- build : génère le client Prisma, compile NestJS, isole les deps de prod ---
FROM deps AS build
COPY . .
# `prisma generate` ne se connecte jamais à la base (il lit juste le schéma) mais exige
# que les env() référencées dans schema.prisma soient définies. Le vrai DATABASE_URL /
# DIRECT_URL de prod est injecté au runtime par docker-compose.prod.yml (.env.production),
# jamais copié dans l'image (voir .dockerignore).
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"
RUN pnpm --filter backend prisma generate
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --prod --legacy /app/deploy/backend
# `pnpm deploy` réinstalle @prisma/client depuis le registre : le client généré par
# `prisma generate` (dossier .prisma/client, moteur binaire inclus) n'y est pas recopié
# automatiquement. On le recopie manuellement au même emplacement dans le store virtuel.
RUN SRC="$(find /app/node_modules/.pnpm -maxdepth 1 -iname '@prisma+client@*' | head -1)" \
    && DST="$(find /app/deploy/backend/node_modules/.pnpm -maxdepth 1 -iname '@prisma+client@*' | head -1)" \
    && cp -r "$SRC/node_modules/.prisma" "$DST/node_modules/.prisma"

# --- runtime : image finale, sans toolchain de build ---
FROM node:20-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/deploy/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/apps/backend/package.json ./package.json

USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
