import "dotenv/config";

import { DatabaseConfig } from "@config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma-generated";
import { log } from "@utils";

const adapter = new PrismaPg(
	{
		connectionString: DatabaseConfig.url,
		max: DatabaseConfig.DB_POOL_MAX,
		idleTimeoutMillis: DatabaseConfig.DB_POOL_IDLE_TIMEOUT_MS,
		connectionTimeoutMillis: DatabaseConfig.DB_POOL_CONNECTION_TIMEOUT_MS,
	},
	{
		onPoolError: (error) => {
			log.error({ error }, "Idle PostgreSQL client error");
		},
	},
);

const prisma = new PrismaClient({
	adapter,
	log: DatabaseConfig.DB_LOG_QUERIES ? [{ emit: "event", level: "query" }] : [],
});

/* Debug-level SQL log behind DB_LOG_QUERIES. Only the statement text and its
   duration are written: parameters carry password hashes and tokens. */
if (DatabaseConfig.DB_LOG_QUERIES) {
	prisma.$on("query", (event) => {
		log.debug({ query: event.query, durationMs: event.duration }, "db query");
	});
}

export { prisma };
