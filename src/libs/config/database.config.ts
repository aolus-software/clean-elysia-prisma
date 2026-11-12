import { env } from "./env.config";

interface IDatabaseConfig {
	url: string;
	DB_POOL_MAX: number;
	DB_POOL_IDLE_TIMEOUT_MS: number;
	DB_POOL_CONNECTION_TIMEOUT_MS: number;
	DB_LOG_QUERIES: boolean;
}

export const DatabaseConfig: IDatabaseConfig = {
	url: env.DATABASE_URL,
	DB_POOL_MAX: env.DB_POOL_MAX,
	DB_POOL_IDLE_TIMEOUT_MS: env.DB_POOL_IDLE_TIMEOUT_MS,
	DB_POOL_CONNECTION_TIMEOUT_MS: env.DB_POOL_CONNECTION_TIMEOUT_MS,
	DB_LOG_QUERIES: env.DB_LOG_QUERIES,
};
