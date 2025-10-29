import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config } from "dotenv";

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
});

// Test database connection
pool.on("connect", () => {
  console.log("✅ PostgreSQL Database connected successfully");
});

pool.on("error", (err: any) => {
  console.error("❌ PostgreSQL Database connection error:", err);
});

pool.on("remove", () => {
  console.log("📤 PostgreSQL Database connection closed");
});

export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export type DbClient = typeof db;
export { schema };

export async function closePool(): Promise<void> {
  await pool.end();
  console.log("🔌 Database pool closed");
}

// Test connection on startup
export async function testConnection(): Promise<{
  connected: boolean;
  message: string;
  details?: any;
}> {
  try {
    const client = await pool.connect();

    // Test basic query
    const result = await client.query(
      "SELECT version(), NOW() as current_time, current_database() as database_name"
    );
    const version = result.rows[0]?.version || "Unknown";
    const databaseName = result.rows[0]?.database_name || "Unknown";

    client.release();

    console.log("✅ Database connection test successful");

    return {
      connected: true,
      message: "Database is connected and responsive",
      details: {
        version: version.split(" ").slice(0, 2).join(" "), // Just get PostgreSQL version
        databaseName,
        connectionTime: result.rows[0]?.current_time,
      },
    };
  } catch (error: any) {
    console.error("❌ Database connection test failed:", error);
    return {
      connected: false,
      message: `Database connection failed: ${error.message}`,
      details: {
        error: error.message,
      },
    };
  }
}

// Get database statistics
export async function getDatabaseStats(): Promise<{
  totalConnections: number;
  idleConnections: number;
  waitingConnections: number;
  databaseSize: string;
}> {
  try {
    const client = await pool.connect();

    // Get connection stats
    const connectionsResult = await client.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);

    // Get database size
    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
    `);

    client.release();

    return {
      totalConnections: parseInt(
        connectionsResult.rows[0]?.total_connections || "0"
      ),
      idleConnections: parseInt(
        connectionsResult.rows[0]?.idle_connections || "0"
      ),
      waitingConnections: parseInt(
        connectionsResult.rows[0]?.active_connections || "0"
      ),
      databaseSize: sizeResult.rows[0]?.database_size || "Unknown",
    };
  } catch (error: any) {
    console.error("Error getting database stats:", error);
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      databaseSize: "Unknown",
    };
  }
}

// Check if database is ready (with retry logic)
export async function waitForDatabase(
  maxRetries = 5,
  delay = 2000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await testConnection();
    if (result.connected) {
      console.log(`✅ Database is ready after ${attempt} attempt(s)`);
      return true;
    }

    console.warn(
      `⚠️ Database not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`
    );

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(
    `❌ Database failed to become ready after ${maxRetries} attempts`
  );
  return false;
}
