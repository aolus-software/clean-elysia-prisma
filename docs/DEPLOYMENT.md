# Deployment

Three ways to run this app in production, plus one option this repo does not
support yet. The entry point is `src/index.ts`.

| Option           | Multi-core | How it scales                | Best for                       |
| ---------------- | ---------- | ---------------------------- | ------------------------------ |
| 1. Node cluster  | ✅         | In-process worker forks      | Single VM/container, simplest  |
| 2. PM2           | ⚠️         | Supervises one process       | VMs needing supervision/reload |
| 3. Docker        | ✅         | Cluster inside one container | Containerized infra            |
| — Bun reuse-port | ❌         | Not implemented — see below  | —                              |

## Scaling flags

`src/index.ts` reads exactly two flags and decides at boot:

- `APP_CLUSTER_MODE` — when `true`, the primary forks `APP_CLUSTER_WORKERS`
  workers (0 = every CPU core) using Node's `cluster` module, and restarts
  any worker that exits.
- `APP_CLUSTER_WORKERS` — worker count for the above.

Both are validated in `src/libs/config/env.config.ts` and surfaced through
`AppConfig`.

> **No SO_REUSEPORT in this repo.** `src/server.ts` calls
> `.listen(AppConfig.APP_PORT)` with no `reusePort` option, and there is no
> `APP_REUSE_PORT` variable. Running several processes on one port therefore
> fails with `EADDRINUSE`. Everything below that would need reuse-port —
> multiple PM2 instances, `docker compose up --scale app=N` — is called out
> as unsupported rather than silently recommended. To add it: validate
> `APP_REUSE_PORT` in `env.config.ts`, surface it in `app.config.ts`, and
> pass `reusePort: true` to `.listen()` in `src/server.ts`.

**Pick exactly one scaling strategy.** Cluster mode and any future
reuse-port setup both bind the same port and will fight each other.

## 1. Node cluster (built in)

No extra processes to manage — one command, the primary forks the workers.

```sh
APP_CLUSTER_MODE=true APP_CLUSTER_WORKERS=0 bun run src/index.ts
# WORKERS=0 -> one worker per CPU core
```

Trade-off: a single OS process tree. If the primary dies, all workers go with
it — pair it with a supervisor (systemd / Docker `restart`) for resilience.

## 2. PM2 — `ecosystem.config.cjs`

PM2 runs the app in **fork** mode, from source. We avoid PM2's `cluster`
exec_mode because it depends on Node's `cluster` module, which Bun only
partially supports.

```sh
bun add -g pm2                      # or npm i -g pm2
make db-generate                    # the Prisma client must exist first
pm2 start ecosystem.config.cjs --env production
pm2 reload clean-elysia-prisma      # zero-downtime reload
pm2 logs clean-elysia-prisma
pm2 save && pm2 startup             # persist across reboots
```

Notes specific to this repo:

- `instances: 1`. Without reuse-port a second instance cannot bind the port.
  The config file still reads `PM2_INSTANCES`, so
  `PM2_INSTANCES=4 pm2 start ecosystem.config.cjs --env production` works,
  but it only becomes useful once reuse-port is wired up and `instances` is
  changed to `Number(process.env.PM2_INSTANCES) || "max"`. It is a
  launcher-side override, not an application variable — it is deliberately
  absent from `.env.example` and from `env.config.ts`.
- `APP_CLUSTER_MODE=false` is set in both env blocks. To use all cores under
  PM2, flip it to `"true"` in `env_production` and keep `instances: 1`: PM2
  then supervises the cluster primary and the primary owns the forks.
- Runs from source (`script: "src/index.ts"`, `interpreter: "bun"`) — no
  build step, because Bun resolves the tsconfig `paths` aliases directly.
  The generated Prisma client (`prisma/generated/`) is not source, so
  `make db-generate` must have run.

## 3. Docker

The `Dockerfile` is **single-stage** (no `development` / `migrator` /
`release` targets). It installs the full dependency set — the `prisma` CLI is
a devDependency and is needed for `prisma generate` at build time and for
migrations in a one-off container — then generates the client, bundles with
`bun run build`, and starts `dist/index.js`.

```sh
docker build -t clean-elysia-prisma .
docker run --rm -p 3000:3000 --env-file .env \
  -e APP_CLUSTER_MODE=true clean-elysia-prisma
```

### Compose

`docker-compose.yml` brings up postgres + redis + clickhouse + the app. The
`app` service loads `.env` via `env_file`, then overrides the connection
variables with the hostnames that resolve **inside** the compose network
(the `.env` defaults point at `localhost`, which is the host, not the
container):

```yaml
DATABASE_URL: postgres://postgres:postgres@postgres:5432/elysia_db
REDIS_HOST: redis
CLICKHOUSE_HOST: http://clickhouse:8123
```

Set `APP_CLUSTER_MODE=true` in `.env` to use every core in the container.
`docker compose up -d --scale app=N` is **not** available: N containers
cannot all publish `3000:3000`, and without reuse-port they could not share
a port even behind a proxy.

```sh
make docker-up        # compose up -d --build
make docker-migrate   # prisma migrate deploy in a one-off app container
make docker-seed      # bun run db:seed in a one-off app container
make docker-logs      # tail app logs
make docker-ps        # stack status
make docker-down      # stop the stack
```

### Git-pull deployment (no registry)

Deploys are `git pull` + local build — no registry involved:

```
/srv/clean-elysia-prisma/   # git checkout on the server
├── docker-compose.yml      # tracked
├── .env                    # NOT tracked — created once, survives pulls
└── ...
```

1. Once, on the server: `cp .env.example .env` and fill in production values.
2. Each deploy (CI/CD over SSH):

   ```sh
   make docker-deploy   # git pull + compose up -d --build + migrate
   ```

   Or step by step:

   ```sh
   git pull
   docker compose up -d --build   # layer cache → only rebuilds what changed
   make docker-migrate
   ```

`.env` is gitignored, so pulls never touch it and secrets never enter the
repo.

---

## Migrations

Always `prisma migrate deploy` in a deployed environment — never
`migrate dev`, which is interactive and can reset data.

```sh
make db-migrate       # on the host, against DATABASE_URL
make docker-migrate   # inside the compose network
```

`make docker-migrate` runs
`docker compose run --rm app bunx --bun prisma migrate deploy`.
There is no separate `migrator` image: `compose run` starts
the `depends_on` services, joins the compose network, and exits when the
migration finishes, so no `--network` flag or image tag is needed.

Seeding is `bun run db:seed` (`make docker-seed` in the stack).

## Choosing

- One box, want simplest → **node cluster** (option 1) under systemd/Docker.
- Need zero-downtime reloads and process metrics on a VM → **PM2**
  (option 2), with cluster mode on if you need all cores.
- Containerized → **Docker** (option 3): cluster inside one container.
  Horizontal replicas behind a proxy need reuse-port support first.
