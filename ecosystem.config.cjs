/**
 * PM2 ecosystem — Bun + Elysia (Prisma).
 *
 * Scaling model: PM2 supervises fork-mode Bun processes. We deliberately do
 * NOT use PM2's `cluster` exec_mode — it relies on Node's `cluster` module,
 * which is only partially supported under Bun.
 *
 * IMPORTANT — SO_REUSEPORT is NOT wired up in this repo. Unlike the Drizzle
 * sibling, `src/server.ts` here calls `.listen(AppConfig.APP_PORT)` with no
 * `reusePort` option, and there is no `APP_REUSE_PORT` variable in
 * `src/libs/config/env.config.ts`. Several instances bound to one port would
 * therefore fail with EADDRINUSE — so `instances` stays at 1.
 *
 * To scale across cores, pick exactly ONE of:
 *   1. Wire up reuse-port: validate `APP_REUSE_PORT` in
 *      `src/libs/config/env.config.ts`, surface it in `app.config.ts`, pass
 *      `reusePort: true` to `.listen()` in `src/server.ts`. Then set
 *      `instances` below to `Number(process.env.PM2_INSTANCES) || "max"` and
 *      add `APP_REUSE_PORT: "true"` to both env blocks.
 *   2. Use the app's own in-process clustering: set `APP_CLUSTER_MODE: "true"`
 *      (plus `APP_CLUSTER_WORKERS`, 0 = every core) and keep `instances: 1`,
 *      so PM2 supervises the cluster primary and the primary owns the forks.
 *
 * `APP_CLUSTER_MODE=false` is set in both env blocks on purpose: the entry
 * point (`src/index.ts`) forks its own node-cluster workers when that flag is
 * true, and they would fight PM2 for the same socket. Pick one strategy — as
 * shipped, PM2 owns process supervision.
 *
 * Runs from source — no build step, because Bun resolves the tsconfig `paths`
 * aliases directly. The generated Prisma client must exist first: run
 * `make db-generate` (writes `prisma/generated/`) before the first start.
 *
 * Environments switch via the `--env` flag, not separate apps.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 reload clean-elysia-prisma    # zero-downtime rolling restart
 *   pm2 logs clean-elysia-prisma
 *   pm2 delete clean-elysia-prisma
 *
 * Override the process count without editing this file (only meaningful once
 * reuse-port is wired up — see above):
 *   PM2_INSTANCES=2 pm2 start ecosystem.config.cjs --env production
 */
module.exports = {
	apps: [
		{
			name: "clean-elysia-prisma",
			// Run from source — Bun resolves tsconfig `paths` aliases directly.
			script: "src/index.ts",
			interpreter: "bun",
			interpreter_args: "run",

			// Fork mode => N independent Bun processes. Leave at 1 until
			// SO_REUSEPORT is wired up, or every extra process fails to bind.
			exec_mode: "fork",
			instances: Number(process.env.PM2_INSTANCES) || 1,

			autorestart: true,
			max_restarts: 10,
			min_uptime: "10s",
			max_memory_restart: "512M",
			kill_timeout: 5000,

			env: {
				NODE_ENV: "development",
				APP_CLUSTER_MODE: "false",
			},
			env_production: {
				NODE_ENV: "production",
				APP_CLUSTER_MODE: "false",
			},
		},
	],
};
