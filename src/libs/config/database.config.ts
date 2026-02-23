import { env } from "./env.config";

interface IDatabaseConfig {
	url: string;
}

export const DatabaseConfig: IDatabaseConfig = {
	url: env.DATABASE_URL,
};
