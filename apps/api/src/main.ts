import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  testConnection,
  waitForDatabase,
  getDatabaseStats,
} from "../../../packages/database/src/index";

async function performStartupChecks() {
  const logger = new Logger("StartupChecks");
  const checks = {
    database: false,
    environment: false,
    configuration: false,
  };

  logger.log("🔍 Performing startup checks...");

  // Check environment variables
  const requiredEnvVars = ["DATABASE_URL"];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    logger.warn(
      `⚠️ Missing environment variables: ${missingEnvVars.join(", ")}`,
    );
  } else {
    checks.configuration = true;
    logger.log("✅ Configuration: All required environment variables are set");
  }

  // Check database connection
  try {
    const dbHealth = await testConnection();
    if (dbHealth.connected) {
      checks.database = true;
      logger.log(`✅ Database: Connected to ${dbHealth.details?.databaseName}`);
    } else {
      logger.warn("⚠️ Database: Connection failed, attempting retry...");
      const dbReady = await waitForDatabase(3, 1000);
      checks.database = dbReady;

      if (dbReady) {
        logger.log("✅ Database: Connection established after retry");
      } else {
        logger.error("❌ Database: Failed to connect after multiple attempts");
      }
    }
  } catch (error: any) {
    logger.error("❌ Database: Connection check failed:", error.message);
  }

  // Environment check
  const nodeEnv = process.env.NODE_ENV || "development";
  checks.environment = true;
  logger.log(`✅ Environment: Running in ${nodeEnv} mode`);

  // Summary
  const allChecksPassed = Object.values(checks).every((check) => check);

  if (allChecksPassed) {
    logger.log("🎉 All startup checks passed!");
  } else {
    logger.warn("⚠️ Some startup checks failed, but continuing...");
  }

  return allChecksPassed;
}

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const port = process.env.PORT ?? 3001;
  const host = process.env.HOST ?? "localhost";

  logger.log("🚀 Starting NestJS server...");

  try {
    // Perform health checks before starting
    await performStartupChecks();

    // Create NestJS application
    const app = await NestFactory.create(AppModule, {
      abortOnError: false,
      logger: ["error", "warn", "log", "debug", "verbose"],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Enable CORS
    app.enableCors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    });

    // Global prefix
    app.setGlobalPrefix("api");

    // Start the application
    await app.listen(port);

    // Success message with detailed information
    const dbStats = await getDatabaseStats();
    logger.log(`✅ NestJS server is running on http://${host}:${port}`);
    logger.log(
      `📊 Database: ${dbStats.totalConnections} connections, ${dbStats.databaseSize} size`,
    );
    logger.log(`🏥 Health: http://${host}:${port}/api/development/health`);
    logger.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (error: any) {
    logger.error("❌ Failed to start application:", error);

    // Enhanced error diagnostics
    if (error.code === "EADDRINUSE") {
      logger.error(`💡 Port ${port} is already in use. Try:"`);
      logger.error(`   - Using a different port: PORT = 3002 npm run start`);
      logger.error(`   - Finding and stopping the process: lsof - i : ${port}`);
    } else if (error.message.includes("ECONNREFUSED")) {
      logger.error("💡 Database connection refused. Please ensure:");
      logger.error(
        "   - PostgreSQL is running: pg_isready or systemctl status postgresql",
      );
      logger.error("   - DATABASE_URL is correct in your .env file");
    }

    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  const logger = new Logger("SIGTERM");
  logger.log("🛑 Graceful shutdown initiated (SIGTERM)");
  process.exit(0);
});

process.on("SIGINT", () => {
  const logger = new Logger("SIGINT");
  logger.log("🛑 Graceful shutdown initiated (SIGINT)");
  process.exit(0);
});

process.on("uncaughtException", (error: any) => {
  const logger = new Logger("uncaughtException");
  logger.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  const logger = new Logger("unhandledRejection");
  logger.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

bootstrap();
