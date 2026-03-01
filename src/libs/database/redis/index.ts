import { RedisConfig } from "@config";
import Redis from "ioredis";

export class RedisClient {
	private static redis: Redis | null = null;

	static getRedisClient(): Redis {
		if (!this.redis) {
			this.redis = new Redis({
				host: RedisConfig.REDIS_HOST,
				port: RedisConfig.REDIS_PORT,
				password: RedisConfig.REDIS_PASSWORD || undefined,
				db: RedisConfig.REDIS_DB,
			});
		}

		return this.redis;
	}

	/**
	 * Returns plain connection options for BullMQ to avoid ioredis version conflicts.
	 * BullMQ bundles its own ioredis, so passing a Redis instance causes type errors.
	 */
	static getQueueConnectionOptions() {
		return {
			host: RedisConfig.REDIS_HOST,
			port: RedisConfig.REDIS_PORT,
			password: RedisConfig.REDIS_PASSWORD || undefined,
			maxRetriesPerRequest: null,
			db: RedisConfig.REDIS_DB,
		};
	}
}
