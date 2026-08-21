/**
 * PM2 ecosystem — Bun + Elysia (Prisma).
 *
 * Scaling model: SO_REUSEPORT. PM2 runs N independent *fork-mode* Bun
 * processes; each binds the same port with `reusePort: true` and the kernel
 * load-balances connections across them. We deliberately do NOT use PM2's
 * `cluster` exec_mode — it relies on Node's `cluster` module, which is only
 * partially supported under Bun.
 *
 * Reuse-port is wired through three places, all mirroring the Drizzle sibling:
 * `APP_REUSE_PORT` is validated in `src/libs/config/env.config.ts`, surfaced on
 * `AppConfig` in `app.config.ts`, and turned into `{ port, reusePort: true }`
 * at the `.listen()` call in `src/server.ts`. Both env blocks below set it, so
 * the instances PM2 launches can share the port instead of failing with
 * EADDRINUSE.
 *
 * The alternative is the app's own in-process clustering: set
 * `APP_CLUSTER_MODE: "true"` (plus `APP_CLUSTER_WORKERS`, 0 = every core),
 * drop `APP_REUSE_PORT`, and pin `instances: 1` so PM2 supervises the cluster
 * primary and the primary owns the forks. Pick exactly one of the two.
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
 * Override the process count without editing this file:
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

			// Fork mode + N instances => N independent Bun processes, each
			// binding APP_PORT with SO_REUSEPORT.
			exec_mode: "fork",
			instances: Number(process.env.PM2_INSTANCES) || "max",

			autorestart: true,
			max_restarts: 10,
			min_uptime: "10s",
			max_memory_restart: "512M",
			kill_timeout: 5000,

			env: {
				NODE_ENV: "development",
				APP_REUSE_PORT: "true",
				APP_CLUSTER_MODE: "false",
			},
			env_production: {
				NODE_ENV: "production",
				APP_REUSE_PORT: "true",
				APP_CLUSTER_MODE: "false",
			},
		},
	],
};
