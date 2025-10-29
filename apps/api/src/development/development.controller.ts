// apps/backend/src/development/development.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Get,
  Logger,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { AdminAuthGuard } from "../common/guards/admin-auth-guard";
import { seed } from "../../../../packages/database/src/seed";
import { EventsService } from "../events/events.service";
import { RedisService } from "../redis/redis.service";
import { db } from "../../../../packages/database/src/index";

// Define local interfaces to avoid external dependency issues
interface DatabaseHealth {
  status: string;
  version?: any;
  database?: any;
  timestamp?: any;
  error?: string;
}

interface ServiceHealth {
  status: string;
  connected?: boolean;
  message?: string;
  details?: any;
  error?: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  services: {
    database: DatabaseHealth;
    redis: ServiceHealth;
  };
  endpoints?: string[];
  error?: string;
}

@Controller("development")
export class DevelopmentController {
  private readonly logger = new Logger(DevelopmentController.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly redisService: RedisService
  ) {}

  @Get("health")
  async healthCheck(): Promise<HealthResponse> {
    try {
      // Check database connection
      const dbResult = await db.execute(
        "SELECT version() as version, current_database() as db_name, NOW() as current_time"
      );
      const dbHealth: DatabaseHealth = {
        status: "connected",
        version: dbResult.rows[0]?.version,
        database: dbResult.rows[0]?.db_name,
        timestamp: dbResult.rows[0]?.current_time,
      };

      // Check Redis connection - don't use the type directly
      const redisHealthResult = await this.redisService.healthCheck();
      const redisHealth: ServiceHealth = {
        status: redisHealthResult.connected ? "connected" : "disconnected",
        connected: redisHealthResult.connected,
        message: redisHealthResult.message,
        details: redisHealthResult.details,
      };

      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth,
          redis: redisHealth,
        },
        endpoints: [
          "POST /api/development/seed - Seed database with sample data",
          "POST /api/development/reset - Reset database and cache",
          "POST /api/development/clear-cache - Clear Redis cache",
          "POST /api/development/update-all-prices - Update all event prices",
          "GET /api/development/health - Health check",
        ],
      };
    } catch (error: any) {
      this.logger.error("Health check failed:", error);

      // Check Redis separately in case database is the only issue
      let redisHealth: ServiceHealth;
      try {
        const redisResult = await this.redisService.healthCheck();
        redisHealth = {
          status: redisResult.connected ? "connected" : "disconnected",
          connected: redisResult.connected,
          message: redisResult.message,
        };
      } catch (redisError: any) {
        redisHealth = {
          status: "error",
          error: redisError.message,
        };
      }

      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: "error",
            error: error.message,
          },
          redis: redisHealth,
        },
      };
    }
  }

  @Get("db-check")
  async checkDatabase(): Promise<{
    status: string;
    message: string;
    details?: any;
    error?: string;
    suggestion?: string[];
  }> {
    try {
      // Test basic database operations
      const versionResult = await db.execute("SELECT version() as version");
      const dbResult = await db.execute(
        "SELECT current_database() as db_name, current_schema() as schema_name"
      );

      // Check if our tables exist
      const tablesResult = await db.execute(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('events', 'bookings')
            `);

      const existingTables = tablesResult.rows.map(
        (row: any) => row.table_name
      );
      const missingTables = ["events", "bookings"].filter(
        (table) => !existingTables.includes(table)
      );

      return {
        status: "connected",
        message: "Database is accessible",
        details: {
          version: versionResult.rows[0]?.version,
          database: dbResult.rows[0]?.db_name,
          schema: dbResult.rows[0]?.schema_name,
          existingTables,
          missingTables,
          tablesReady: missingTables.length === 0,
        },
      };
    } catch (error: any) {
      this.logger.error("Database check failed:", error);
      return {
        status: "error",
        message: "Database connection failed",
        error: error.message,
      };
    }
  }

  // @Post("seed")
  // @UseGuards(AdminAuthGuard)
  // async seedDatabase(): Promise<{
  //   success: boolean;
  //   message: string;
  //   statusCode: number;
  //   timestamp: string;
  //   details?: any;
  //   error?: string;
  //   suggestion?: string;
  // }> {
  //   this.logger.log("🌱 Starting database seeding...");

  //   try {
  //     // Check if database is ready
  //     const dbCheck = await this.checkDatabase();
  //     if (dbCheck.status !== "connected") {
  //       throw new BadRequestException(`Database not ready: ${dbCheck.message}`);
  //     }

  //     this.logger.log("📊 Database status:", dbCheck.details);

  //     // Run the seed
  //     await seed();

  //     // Clear cache
  //     await this.redisService.clearAll();

  //     this.logger.log("✅ Database seeded successfully");

  //     return {
  //       success: true,
  //       message: "Database seeded successfully and cache cleared",
  //       statusCode: HttpStatus.CREATED,
  //       timestamp: new Date().toISOString(),
  //       details: {
  //         eventsCreated: 2, // Based on your seed data
  //         bookingsCreated: 2, // Based on your seed data
  //         cacheCleared: true,
  //       },
  //     };
  //   } catch (error: any) {
  //     this.logger.error("❌ Seeding failed:", error);

  //     return {
  //       success: false,
  //       message: `Seeding failed: ${error.message}`,
  //       error: error.toString(),
  //       statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  //       timestamp: new Date().toISOString(),
  //       suggestion:
  //         "Check if database tables exist. Run migrations first or use the reset endpoint.",
  //     };
  //   }
  // }

  @Post("reset")
  @UseGuards(AdminAuthGuard)
  async resetDatabase(): Promise<{
    success: boolean;
    message: string;
    statusCode: number;
    timestamp: string;
    details?: any;
    error?: string;
  }> {
    this.logger.log("🔄 Starting database reset...");

    try {
      // Clear cache first
      await this.redisService.clearAll();
      this.logger.log("✅ Cache cleared");

      // Run the seed (which will clear and recreate data)
      await seed();

      this.logger.log("✅ Database reset successfully");

      return {
        success: true,
        message: "Database reset successfully",
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        details: {
          cacheCleared: true,
          dataReseeded: true,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ Database reset failed:", error);

      return {
        success: false,
        message: `Database reset failed: ${error.message}`,
        error: error.toString(),
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post("clear-cache")
  @UseGuards(AdminAuthGuard)
  async clearCache(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
  }> {
    this.logger.log("🧹 Clearing cache...");

    try {
      const result = await this.redisService.clearAll();

      if (result) {
        this.logger.log("✅ Cache cleared successfully");
        return {
          success: true,
          message: "Cache cleared successfully",
          timestamp: new Date().toISOString(),
        };
      } else {
        this.logger.warn("⚠️ Cache clearance may not have completed fully");
        return {
          success: false,
          message: "Cache clearance may not have completed fully",
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      this.logger.error("❌ Cache clearance failed:", error);
      throw new BadRequestException(`Cache clearance failed: ${error.message}`);
    }
  }

  @Post("update-all-prices")
  @UseGuards(AdminAuthGuard)
  async updateAllPrices(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
    details?: any;
  }> {
    this.logger.log("💰 Updating all event prices...");

    try {
      await this.eventsService.invalidateCache();

      this.logger.log("✅ Price update cache invalidated");

      return {
        success: true,
        message: "Cache invalidated for price updates",
        timestamp: new Date().toISOString(),
        details: {
          cacheInvalidated: true,
          nextRequestWillRecalculate: true,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ Price update failed:", error);
      throw new BadRequestException(`Price update failed: ${error.message}`);
    }
  }

  @Post("create-tables")
  @UseGuards(AdminAuthGuard)
  async createTables(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
    tablesCreated?: string[];
    error?: string;
  }> {
    this.logger.log("🏗️ Creating database tables...");

    try {
      // Simple table creation (adjust based on your schema)
      await db.execute(`
                CREATE TABLE IF NOT EXISTS events (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    date TIMESTAMP NOT NULL,
                    venue VARCHAR(255) NOT NULL,
                    description TEXT,
                    capacity INTEGER NOT NULL,
                    booked_tickets INTEGER NOT NULL DEFAULT 0,
                    base_price NUMERIC(10,2) NOT NULL,
                    current_price NUMERIC(10,2) NOT NULL,
                    floor_price NUMERIC(10,2) NOT NULL,
                    ceiling_price NUMERIC(10,2) NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    pricing_rules JSONB NOT NULL DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

      await db.execute(`
                CREATE TABLE IF NOT EXISTS bookings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    event_id UUID REFERENCES events(id),
                    customer_email VARCHAR(255) NOT NULL,
                    ticket_count INTEGER NOT NULL,
                    total_amount NUMERIC(10,2) NOT NULL,
                    status VARCHAR(50) DEFAULT 'confirmed',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

      this.logger.log("✅ Database tables created successfully");

      return {
        success: true,
        message: "Database tables created successfully",
        timestamp: new Date().toISOString(),
        tablesCreated: ["events", "bookings"],
      };
    } catch (error: any) {
      this.logger.error("❌ Table creation failed:", error);

      return {
        success: false,
        message: `Table creation failed: ${error.message}`,
        error: error.toString(),
        timestamp: new Date().toISOString(),
      };
    }
  }
}
