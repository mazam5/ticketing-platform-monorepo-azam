import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { Cache } from "cache-manager";

interface RedisHealth {
  status: string;
  connected: boolean;
  message: string;
  responseTime?: number;
  details?: any;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private isConnected = false;
  private connectionTested = false;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleInit() {
    this.logger.log("🔄 Initializing Redis service...");
    await this.testConnection();
  }

  async onModuleDestroy() {
    this.logger.log("🔌 Redis service shutting down");
    this.isConnected = false;
  }

  async testConnection(): Promise<RedisHealth> {
    if (this.connectionTested && this.isConnected) {
      return {
        status: "healthy",
        connected: true,
        message: "Redis is connected (cached)",
      };
    }

    this.logger.log("🔌 Testing Redis connection...");
    const startTime = Date.now();

    try {
      // Test Redis connection by setting and getting a test key
      const testKey = "redis_connection_test";
      const testValue = "connected_" + Date.now();
      const testTtl = 5; // 5 seconds

      await this.cacheManager.set(testKey, testValue, testTtl);
      const result = await this.cacheManager.get<string>(testKey);

      const responseTime = Date.now() - startTime;

      if (result === testValue) {
        this.isConnected = true;
        this.connectionTested = true;

        // Test deletion as well
        await this.cacheManager.del(testKey);

        this.logger.log(`✅ Redis connected successfully (${responseTime}ms)`);

        return {
          status: "healthy",
          connected: true,
          message: "Redis is connected and responsive",
          responseTime,
          details: {
            responseTime: `${responseTime}ms`,
            operation: "read/write test",
          },
        };
      } else {
        this.isConnected = false;
        this.connectionTested = true;
        this.logger.warn("⚠️ Redis connection test returned unexpected result");

        return {
          status: "unhealthy",
          connected: false,
          message: "Redis returned unexpected test result",
          responseTime,
          details: {
            expected: testValue,
            received: result,
          },
        };
      }
    } catch (error: any) {
      this.isConnected = false;
      this.connectionTested = true;
      const responseTime = Date.now() - startTime;

      this.logger.error(`❌ Redis connection failed: ${error.message}`);

      return {
        status: "unhealthy",
        connected: false,
        message: `Redis connection failed: ${error.message}`,
        responseTime,
        details: {
          error: error.message,
          responseTime: `${responseTime}ms`,
        },
      };
    }
  }

  async getConnectionStatus(): Promise<{
    connected: boolean;
    tested: boolean;
  }> {
    return {
      connected: this.isConnected,
      tested: this.connectionTested,
    };
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      this.logger.warn(`Redis not connected, cannot get key: ${key}`);
      return null;
    }

    try {
      const value = await this.cacheManager.get<T>(key);
      return value || null;
    } catch (error: any) {
      this.logger.error(`Error getting key ${key} from cache:`, error.message);
      // If we get an error, mark as disconnected and retest
      await this.testConnection();
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn(`Redis not connected, cannot set key: ${key}`);
      return false;
    }

    try {
      await this.cacheManager.set(key, value, ttl || this.CACHE_TTL);
      return true;
    } catch (error: any) {
      this.logger.error(`Error setting key ${key} in cache:`, error.message);
      // If we get an error, mark as disconnected and retest
      await this.testConnection();
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn(`Redis not connected, cannot delete key: ${key}`);
      return false;
    }

    try {
      await this.cacheManager.del(key);
      return true;
    } catch (error: any) {
      this.logger.error(`Error deleting key ${key} from cache:`, error.message);
      // If we get an error, mark as disconnected and retest
      await this.testConnection();
      return false;
    }
  }

  async reset(): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn("Redis not connected, cannot reset cache");
      return false;
    }

    try {
      // Try to use the store's reset method if available
      const store: any = (this.cacheManager as any).store;
      if (store && typeof store.reset === "function") {
        await store.reset();
        this.logger.log("✅ Cache reset successfully using store.reset()");
        return true;
      }

      // Fallback: try to clear using keys pattern (this may not work for all stores)
      this.logger.warn(
        "⚠️ Store reset not available, using manual key tracking"
      );
      return false;
    } catch (error: any) {
      this.logger.error("Error resetting cache:", error.message);
      await this.testConnection();
      return false;
    }
  }

  async clearAll(): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn("Redis not connected, cannot clear cache");
      return false;
    }

    try {
      // For memory store and some Redis implementations
      const store: any = (this.cacheManager as any).store;

      if (store && typeof store.reset === "function") {
        await store.reset();
        this.logger.log("✅ Cache cleared successfully using store.reset()");
        return true;
      } else if (store && typeof store.keys === "function") {
        // Alternative approach for stores that support keys()
        const keys = await store.keys();
        for (const key of keys) {
          await this.del(key);
        }
        this.logger.log(
          `✅ Cache cleared successfully, removed ${keys.length} keys`
        );
        return true;
      } else {
        this.logger.warn(
          "⚠️ Cache store does not support reset or keys operations"
        );
        return false;
      }
    } catch (error: any) {
      this.logger.error("Error clearing cache:", error.message);
      await this.testConnection();
      return false;
    }
  }

  // Event-specific cache methods with proper typing
  async getEvent(eventId: string): Promise<any> {
    const result = await this.get<any>(`event:${eventId}`);
    if (result) {
      this.logger.debug(`✅ Cache hit for event:${eventId}`);
    } else {
      this.logger.debug(`❌ Cache miss for event:${eventId}`);
    }
    return result;
  }

  async setEvent(eventId: string, event: any): Promise<boolean> {
    const success = await this.set(`event:${eventId}`, event, 60); // 1 minute for events
    if (success) {
      this.logger.debug(`✅ Cache set for event:${eventId}`);
    }
    return success;
  }

  async getEventPrice(eventId: string): Promise<number | null> {
    const result = await this.get<number>(`event:${eventId}:price`);
    if (result) {
      this.logger.debug(`✅ Cache hit for event price:${eventId}`);
    } else {
      this.logger.debug(`❌ Cache miss for event price:${eventId}`);
    }
    return result;
  }

  async setEventPrice(eventId: string, price: number): Promise<boolean> {
    const success = await this.set(`event:${eventId}:price`, price, 30); // 30 seconds for prices
    if (success) {
      this.logger.debug(`✅ Cache set for event price:${eventId}`);
    }
    return success;
  }

  async invalidateEvent(eventId: string): Promise<void> {
    this.logger.log(`🔄 Invalidating cache for event:${eventId}`);

    const tasks = [
      this.del(`event:${eventId}`),
      this.del(`event:${eventId}:price`),
      this.del(`events:all`),
    ];

    await Promise.allSettled(tasks);
    this.logger.debug(`✅ Cache invalidated for event:${eventId}`);
  }

  // Rate limiting for bookings
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn(
        `Redis not connected, rate limiting disabled for: ${key}`
      );
      return true; // Allow requests if Redis is down
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const requests = (await this.get<number[]>(key)) || [];

      // Remove requests outside current window
      const recentRequests = requests.filter((time) => time > windowStart);

      if (recentRequests.length >= limit) {
        this.logger.warn(
          `🚫 Rate limit exceeded for key: ${key}, requests: ${recentRequests.length}, limit: ${limit}`
        );
        return false; // Rate limit exceeded
      }

      // Add current request
      recentRequests.push(now);
      const success = await this.set(key, recentRequests, windowMs / 1000);

      if (success) {
        this.logger.debug(
          `✅ Rate limit check passed for key: ${key}, requests: ${recentRequests.length}`
        );
      }

      return true;
    } catch (error: any) {
      this.logger.error(
        `Error checking rate limit for key ${key}:`,
        error.message
      );
      // If we get an error, mark as disconnected and retest
      await this.testConnection();
      return true; // Allow on error
    }
  }

  // Health check method
  async healthCheck(): Promise<RedisHealth> {
    return await this.testConnection();
  }

  // Get cache statistics (basic implementation)
  async getStats(): Promise<{
    connected: boolean;
    service: string;
    storeInfo?: any;
  }> {
    const store: any = (this.cacheManager as any).store;
    const storeName = store?.name || "unknown";
    const storeInfo = store?.getClient ? await this.getStoreInfo(store) : null;

    return {
      connected: this.isConnected,
      service: storeName,
      storeInfo,
    };
  }

  private async getStoreInfo(store: any): Promise<any> {
    try {
      const client = store.getClient();
      if (client && typeof client.info === "function") {
        const info = await client.info();
        return {
          version:
            info
              .split("\r\n")
              .find((line: string) => line.startsWith("redis_version:"))
              ?.split(":")[1] || "unknown",
          mode:
            info
              .split("\r\n")
              .find((line: string) => line.startsWith("redis_mode:"))
              ?.split(":")[1] || "unknown",
        };
      }
    } catch (error: any) {
      this.logger.debug("Could not get Redis store info:", error.message);
    }
    return null;
  }

  // Wait for Redis to be ready (with retry logic)
  async waitForRedis(maxRetries = 5, delay = 2000): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const health = await this.testConnection();
      if (health.connected) {
        this.logger.log(`✅ Redis is ready after ${attempt} attempt(s)`);
        return true;
      }

      this.logger.warn(
        `⚠️ Redis not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.logger.error(
      `❌ Redis failed to become ready after ${maxRetries} attempts`
    );
    return false;
  }
}
