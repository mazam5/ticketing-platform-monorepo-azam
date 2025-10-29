import {
  BadRequestException,
  Controller,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminAuthGuard } from "src/common/guards/admin-auth-guard";
import { RedisService } from "src/redis/redis.service";
import { db } from "../../../../packages/database/src/index";
import { seed } from "../../../../packages/database/src/seed";
import { SeedService } from "./seed.service";

@Controller("seed")
export class SeedController {
  private readonly logger = new Logger(SeedController.name);

  constructor(
    private readonly seedService: SeedService,
    private readonly redisService: RedisService
  ) {}
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

  @Post()
  @UseGuards(AdminAuthGuard)
  async seedDatabase(): Promise<{
    success: boolean;
    message: string;
    statusCode: number;
    timestamp: string;
    details?: any;
    error?: string;
    suggestion?: string;
  }> {
    this.logger.log("🌱 Starting database seeding...");

    try {
      // Check if database is ready
      const dbCheck = await this.checkDatabase();
      if (dbCheck.status !== "connected") {
        throw new BadRequestException(`Database not ready: ${dbCheck.message}`);
      }

      this.logger.log("📊 Database status:", dbCheck.details);

      // Run the seed
      await seed();

      // Clear cache
      await this.redisService.clearAll();

      this.logger.log("✅ Database seeded successfully");

      return {
        success: true,
        message: "Database seeded successfully and cache cleared",
        statusCode: HttpStatus.CREATED,
        timestamp: new Date().toISOString(),
        details: {
          eventsCreated: 2, // Based on your seed data
          bookingsCreated: 2, // Based on your seed data
          cacheCleared: true,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ Seeding failed:", error);

      return {
        success: false,
        message: `Seeding failed: ${error.message}`,
        error: error.toString(),
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        suggestion:
          "Check if database tables exist. Run migrations first or use the reset endpoint.",
      };
    }
  }
}
