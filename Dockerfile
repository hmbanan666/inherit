FROM node:24-alpine AS build
WORKDIR /workshop
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/sim/package.json packages/sim/
COPY packages/sandbox/package.json packages/sandbox/
COPY patches patches/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workshop/apps/web/.output/public /usr/share/nginx/html
EXPOSE 80
