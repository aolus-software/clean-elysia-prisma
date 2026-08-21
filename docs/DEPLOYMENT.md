# Deployment

Four ways to run this app in production. The entry point is `src/index.ts`.

| Option            | Multi-core | How it scales                         | Best for                       |
| ----------------- | ---------- | ------------------------------------- | ------------------------------ |
| 1. Node cluster   | ✅         | In-process worker forks               | Single VM/container, simplest  |
| 2. Bun reuse-port | ✅         | N independent processes, SO_REUSEPORT | Bare metal / systemd           |
| 3. PM2            | ✅         | PM2 forks N reuse-port processes      | VMs needing supervision/reload |
| 4. Docker         | ✅         | Cluster inside one container          | Containerized infra            |

## Scaling flags

`src/index.ts` and `src/server.ts` read three flags and decide at boot:

- `APP_CLUSTER_MODE` — when `true`, the primary forks `APP_CLUSTER_WORKERS`
  workers (0 = every CPU core) using Node's `cluster` module, and restarts
  any worker that exits.
- `APP_CLUSTER_WORKERS` — worker count for the above.
- `APP_REUSE_PORT` — when `true`, each process binds the port with
  `reusePort: true` (`src/server.ts`); the kernel load-balances. You launch N
  processes yourself (PM2, systemd, `--scale`).

All three are validated in `src/libs/config/env.config.ts` and surfaced
through `AppConfig`.

**Pick exactly one scaling strategy.** Cluster mode and reuse-port both bind
the same port and will fight each other if enabled together.

## 1. Node cluster (built in)

No extra processes to manage — one command, the primary forks the workers.

```sh
APP_CLUSTER_MODE=true APP_CLUSTER_WORKERS=0 bun run src/index.ts
# WORKERS=0 -> one worker per CPU core
```

Trade-off: a single OS process tree. If the primary dies, all workers go with
it — pair it with a supervisor (systemd / Docker `restart`) for resilience.

## 2. Bun reuse-port

Each process is fully independent; the kernel spreads connections via
SO_REUSEPORT. No primary, no shared socket fd.

```sh
# Launch as many as you want — all on APP_PORT
APP_REUSE_PORT=true bun run src/index.ts &
APP_REUSE_PORT=true bun run src/index.ts &
APP_REUSE_PORT=true bun run src/index.ts &
```

Leave `APP_CLUSTER_MODE=false`. In practice you let a supervisor (PM2 below,
or systemd templated units) own the N processes rather than `&`.

## 3. PM2 — `ecosystem.config.cjs`

PM2 supervises N fork-mode Bun processes, each with `APP_REUSE_PORT=true`,
running from source. We avoid PM2's `cluster` exec_mode because it depends on
Node's `cluster` module, which Bun only partially supports.

```sh
bun add -g pm2                      # or npm i -g pm2
make db-generate                    # the Prisma client must exist first
pm2 start ecosystem.config.cjs --env production
pm2 reload clean-elysia-prisma      # zero-downtime reload
pm2 logs clean-elysia-prisma
pm2 save && pm2 startup             # persist across reboots
```

Notes specific to this repo:

- `instances` defaults to `max` (all cores), with `APP_REUSE_PORT=true` in
  both env blocks so the processes share `APP_PORT`. Override the count with
  `PM2_INSTANCES=4 pm2 start ecosystem.config.cjs --env production`. It is a
  launcher-side override, not an application variable — it is deliberately
  absent from `.env.example` and from `env.config.ts`.
- `APP_CLUSTER_MODE=false` is set in both env blocks — reuse-port owns the
  scaling. The alternative is in-process clustering: flip it to `"true"`,
  drop `APP_REUSE_PORT`, and pin `instances: 1` so PM2 supervises the cluster
  primary and the primary owns the forks. Never both at once.
- Runs from source (`script: "src/index.ts"`, `interpreter: "bun"`) — no
  build step, because Bun resolves the tsconfig `paths` aliases directly.
  The generated Prisma client (`prisma/generated/`) is not source, so
  `make db-generate` must have run.

## 4. Docker

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

`docker compose up -d --scale app=N` needs the published-port mapping removed
from the `app` service first — N containers cannot all publish `3000:3000`.
Put them behind a reverse proxy on the compose network and set
`APP_CLUSTER_MODE=false` + `APP_REUSE_PORT=true`, or keep one container and
let cluster mode use the cores inside it.

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
- Bare metal with systemd templated units → **reuse-port** (option 2).
- Need zero-downtime reloads and process metrics on a VM → **PM2**
  (option 3), which is reuse-port with supervision on top.
- Containerized → **Docker** (option 4): cluster inside one container, or
  reuse-port replicas behind a proxy.
