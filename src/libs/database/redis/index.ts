import { RedisConfig } from "@config";
import { RedisClient as BunRedisClient } from "bun";

export class RedisClient {
	private static client: BunRedisClient | null = null;

	static getRedisClient(): BunRedisClient {
		if (!this.client) {
			this.client = new BunRedisClient(this.buildUrl());
		}

		return this.client;
	}

	/**
	 * Plain connection options for BullMQ. BullMQ is built on ioredis and does
	 * not support Bun's native Redis client — it spins up its own ioredis from
	 * these options internally.
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

	static disconnect(): void {
		if (this.client) {
			this.client.close();
			this.client = null;
		}
	}

	private static buildUrl(): string {
		const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } = RedisConfig;
		const auth = REDIS_PASSWORD
			? `:${encodeURIComponent(REDIS_PASSWORD)}@`
			: "";
		return `redis://${auth}${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}`;
	}
}
