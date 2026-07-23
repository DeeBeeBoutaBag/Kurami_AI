import { Redis } from "ioredis";
import { config } from "./config.js";
import { logger } from "./logger.js";

export interface LiveHealth {
  redisConfigured: boolean;
  redisConnected: boolean;
  mode: "redis" | "memory";
}

export class LiveState {
  private redis: Redis | null = null;
  private connected = false;
  private memory = new Map<string, string>();

  async connect() {
    if (!config.REDIS_URL) {
      logger.info("Redis URL not provided; using in-memory live state.");
      return;
    }

    this.redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (attempt: number) => Math.min(attempt * 100, 2_000)
    });

    this.redis.on("connect", () => {
      this.connected = true;
      logger.info("Redis live state connected.");
    });
    this.redis.on("error", (error: Error) => {
      this.connected = false;
      logger.warn({ error }, "Redis live state error; server will continue with degraded live sync.");
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = this.redis ? await this.redis.get(key) : this.memory.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    const raw = JSON.stringify(value);
    if (this.redis) {
      if (ttlSeconds) {
        await this.redis.set(key, raw, "EX", ttlSeconds);
      } else {
        await this.redis.set(key, raw);
      }
      return;
    }
    this.memory.set(key, raw);
  }

  async close() {
    await this.redis?.quit();
  }

  health(): LiveHealth {
    return {
      redisConfigured: Boolean(config.REDIS_URL),
      redisConnected: this.connected,
      mode: this.redis ? "redis" : "memory"
    };
  }
}
