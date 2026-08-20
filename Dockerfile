FROM oven/bun:1.1.13-alpine

WORKDIR /app

# Install Node.js (the Prisma CLI and its query engine need a Node runtime)
RUN apk add --no-cache nodejs npm

# Install concurrently globally for build/start scripts
RUN npm install -g concurrently

COPY package.json bun.lock ./

# Full install, not --production: `prisma` is a devDependency and is needed
# both for `prisma generate` below and for `make docker-migrate` / db:seed in
# a one-off container. --ignore-scripts skips the "prepare" (husky) lifecycle:
# git hooks don't exist inside an image and husky is a devDependency anyway.
RUN bun install --ignore-scripts

COPY . .

# Generate the Prisma client into prisma/generated (see the `generator client`
# block in prisma/schema.prisma) before bundling. `generate` never connects to
# the database, but prisma.config.ts reads DATABASE_URL, so pass a placeholder.
RUN DATABASE_URL="postgresql://placeholder" bunx --bun prisma generate

# Build the app
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
