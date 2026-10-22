# Node 24 + Yarn 4 probot app for ionic, from electron/ionic-kit's
# templates/Dockerfile.node.

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
RUN yarn install --immutable
COPY tsconfig.json ./
COPY src/ ./src/
RUN yarn build

FROM node:24-alpine
WORKDIR /app
# Keep Corepack's Yarn download in the image (world-readable) rather than in
# root's $HOME, so `yarn` in CMD starts as uid 1000 without fetching Yarn from
# repo.yarnpkg.com on every pod start.
ENV COREPACK_HOME=/usr/local/share/corepack
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
# Production deps only; `focus` also works on a single-workspace repo.
RUN yarn workspaces focus --all --production \
 && yarn cache clean
COPY --from=build /app/lib ./lib

# The cluster runs pods as uid/gid 1000 with a read-only root filesystem and a
# writable emptyDir at /tmp. HOME=/tmp keeps anything that writes to $HOME at
# runtime (git config, npm, corepack) off the read-only layers.
USER 1000:1000
ENV NODE_ENV=production \
    PORT=8080 \
    HOME=/tmp
EXPOSE 8080
# No HEALTHCHECK: Kubernetes probes probot's GET /ping (set in the overlay).
# probot reads PORT.
CMD ["yarn", "probot", "run", "./lib/index.js"]
