FROM node:22-bookworm-slim AS app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/app/app.db
ENV TRACK_STORAGE_PATH=/data/tracks

WORKDIR /workspace
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY . .
RUN pnpm prisma:generate && pnpm --filter @ai-music-lab/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@ai-music-lab/web", "start"]
