import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { EventsController } from "./events/events.controller";
import { EventsService } from "./events/events.service";
import { BookingsController } from "./bookings/bookings.controller";
import { BookingsService } from "./bookings/bookings.service";
import { AnalyticsController } from "./analytics/analytics.controller";
import { AnalyticsService } from "./analytics/analytics.service";
import { PricingService } from "./pricing/pricing.service";
import { DevelopmentController } from "./development/development.controller";
import { RedisService } from "./redis/redis.service";
import { SeedController } from "./seed/seed.controller";
import { SeedService } from "./seed/seed.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get("REDIS_HOST") || "localhost";
        const redisPort = configService.get("REDIS_PORT") || 6379;

        // For development, use memory store if Redis is not available
        if (redisHost === "memory" || process.env.NODE_ENV === "test") {
          return {
            ttl: 300, // 5 minutes
            max: 100, // maximum number of items in cache
          };
        }

        // For Redis
        const redisStore = await import("cache-manager-redis-store");
        return {
          store: redisStore,
          host: redisHost,
          port: redisPort,
          ttl: 300, // 5 minutes cache TTL
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [
    EventsController,
    BookingsController,
    AnalyticsController,
    DevelopmentController,
    SeedController,
  ],
  providers: [
    EventsService,
    BookingsService,
    AnalyticsService,
    PricingService,
    RedisService,
    SeedService,
  ],
})
export class AppModule {}
