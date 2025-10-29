import { Injectable, Logger } from "@nestjs/common";
import { eq, sql, and, gte, desc } from "drizzle-orm";
import { db, schema } from "../../../../packages/database/src";

export interface EventAnalytics {
  totalBookings: number;
  totalTickets: number;
  totalRevenue: number;
  averageTicketPrice: number;
  occupancyRate: number;
  revenuePotential: number;
  utilizationRate: number;
  bookingTrend: "increasing" | "decreasing" | "stable";
  peakBookingHours: Array<{ hour: number; bookings: number }>;
}

export interface SystemAnalytics {
  totalEvents: number;
  activeEvents: number;
  totalCapacity: number;
  totalBookedTickets: number;
  totalRevenue: number;
  averageOccupancyRate: number;
  topPerformingEvents: Array<{
    id: string;
    name: string;
    revenue: number;
    occupancyRate: number;
  }>;
  revenueByEvent: Array<{
    eventId: string;
    eventName: string;
    revenue: number;
    ticketsSold: number;
  }>;
  bookingVelocity: number; // Bookings per hour
  popularEventTimes: Array<{ hour: number; bookings: number }>;
}

export interface RevenueAnalytics {
  dailyRevenue: Array<{ date: string; revenue: number }>;
  weeklyRevenue: Array<{ week: string; revenue: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  /**
   * Get comprehensive analytics for a specific event
   */
  async getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    try {
      // Get basic event info
      const [event] = await db
        .select()
        .from(schema.events)
        .where(eq(schema.events.id, eventId));

      if (!event) {
        throw new Error("Event not found");
      }

      // Get booking statistics - don't filter by status since it might not exist
      const bookingStats = await db
        .select({
          totalBookings: sql<number>`count(${schema.bookings.id})`,
          totalTickets: sql<number>`sum(${schema.bookings.ticketCount})`,
          totalRevenue: sql<number>`sum(${schema.bookings.totalAmount})`,
          averageTicketPrice: sql<number>`avg(${schema.bookings.totalAmount})`,
        })
        .from(schema.bookings)
        .where(eq(schema.bookings.eventId, eventId))
        .then((rows) => rows[0]);

      // Get booking trend (last 7 days vs previous 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const recentBookings = await db
        .select({ bookings: sql<number>`count(*)` })
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.eventId, eventId),
            gte(schema.bookings.createdAt, sevenDaysAgo),
          ),
        )
        .then((rows) => Number(rows[0].bookings) || 0);

      const previousBookings = await db
        .select({ bookings: sql<number>`count(*)` })
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.eventId, eventId),
            gte(schema.bookings.createdAt, fourteenDaysAgo),
            sql`${schema.bookings.createdAt} < ${sevenDaysAgo}`,
          ),
        )
        .then((rows) => Number(rows[0].bookings) || 0);

      // Determine booking trend
      let bookingTrend: "increasing" | "decreasing" | "stable" = "stable";
      if (previousBookings > 0) {
        if (recentBookings > previousBookings * 1.2) {
          bookingTrend = "increasing";
        } else if (recentBookings < previousBookings * 0.8) {
          bookingTrend = "decreasing";
        }
      } else if (recentBookings > 0) {
        bookingTrend = "increasing";
      }

      // Get peak booking hours
      const peakHours = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${schema.bookings.createdAt})`,
          bookings: sql<number>`count(*)`,
        })
        .from(schema.bookings)
        .where(eq(schema.bookings.eventId, eventId))
        .groupBy(sql`EXTRACT(HOUR FROM ${schema.bookings.createdAt})`)
        .orderBy(desc(sql`count(*)`));

      // Calculate metrics
      const totalBookings = Number(bookingStats.totalBookings) || 0;
      const totalTickets = Number(bookingStats.totalTickets) || 0;
      const totalRevenue = Number(bookingStats.totalRevenue) || 0;
      const averageTicketPrice =
        totalBookings > 0 ? totalRevenue / totalBookings : 0;
      const occupancyRate =
        event.capacity > 0 ? (event.bookedTickets / event.capacity) * 100 : 0;
      const revenuePotential = event.capacity * parseFloat(event.currentPrice);
      const utilizationRate =
        event.capacity > 0 ? (totalTickets / event.capacity) * 100 : 0;

      return {
        totalBookings,
        totalTickets,
        totalRevenue,
        averageTicketPrice,
        occupancyRate,
        revenuePotential,
        utilizationRate,
        bookingTrend,
        peakBookingHours: peakHours.map((h) => ({
          hour: Number(h.hour),
          bookings: Number(h.bookings),
        })),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get event analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get system-wide analytics
   */
  async getSystemAnalytics(): Promise<SystemAnalytics> {
    try {
      // Get event statistics
      const totalEvents = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .then((rows) => Number(rows[0].count) || 0);

      const activeEvents = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .where(eq(schema.events.isActive, true))
        .then((rows) => Number(rows[0].count) || 0);

      const capacityStats = await db
        .select({
          totalCapacity: sql<number>`sum(${schema.events.capacity})`,
          totalBookedTickets: sql<number>`sum(${schema.events.bookedTickets})`,
        })
        .from(schema.events)
        .then((rows) => rows[0]);

      // Get total revenue from all bookings - no status filter
      const revenueStats = await db
        .select({
          totalRevenue: sql<number>`sum(${schema.bookings.totalAmount})`,
        })
        .from(schema.bookings)
        .then((rows) => rows[0]);

      // Get top performing events by revenue
      const topEvents = await db
        .select({
          id: schema.events.id,
          name: schema.events.name,
          revenue: sql<number>`COALESCE(SUM(${schema.bookings.totalAmount}), 0)`,
          ticketsSold: sql<number>`COALESCE(SUM(${schema.bookings.ticketCount}), 0)`,
          capacity: schema.events.capacity,
          bookedTickets: schema.events.bookedTickets,
        })
        .from(schema.events)
        .leftJoin(
          schema.bookings,
          eq(schema.bookings.eventId, schema.events.id),
        )
        .groupBy(
          schema.events.id,
          schema.events.name,
          schema.events.capacity,
          schema.events.bookedTickets,
        )
        .orderBy(desc(sql`COALESCE(SUM(${schema.bookings.totalAmount}), 0)`))
        .limit(5);

      // Calculate booking velocity (bookings per hour in last 24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const recentBookings = await db
        .select({ bookings: sql<number>`count(*)` })
        .from(schema.bookings)
        .where(gte(schema.bookings.createdAt, twentyFourHoursAgo))
        .then((rows) => Number(rows[0].bookings) || 0);

      // Get popular booking hours across all events
      const popularHours = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${schema.bookings.createdAt})`,
          bookings: sql<number>`count(*)`,
        })
        .from(schema.bookings)
        .groupBy(sql`EXTRACT(HOUR FROM ${schema.bookings.createdAt})`)
        .orderBy(desc(sql`count(*)`))
        .limit(6);

      // Calculate average occupancy rate
      const eventsWithOccupancy = await db
        .select({
          capacity: schema.events.capacity,
          bookedTickets: schema.events.bookedTickets,
        })
        .from(schema.events)
        .where(eq(schema.events.isActive, true));

      const averageOccupancyRate =
        eventsWithOccupancy.length > 0
          ? eventsWithOccupancy.reduce((sum, event) => {
              const occupancy =
                event.capacity > 0
                  ? (event.bookedTickets / event.capacity) * 100
                  : 0;
              return sum + occupancy;
            }, 0) / eventsWithOccupancy.length
          : 0;

      return {
        totalEvents,
        activeEvents,
        totalCapacity: Number(capacityStats.totalCapacity) || 0,
        totalBookedTickets: Number(capacityStats.totalBookedTickets) || 0,
        totalRevenue: Number(revenueStats.totalRevenue) || 0,
        averageOccupancyRate,
        topPerformingEvents: topEvents.map((event) => ({
          id: event.id,
          name: event.name,
          revenue: Number(event.revenue) || 0,
          occupancyRate:
            event.capacity > 0
              ? (event.bookedTickets / event.capacity) * 100
              : 0,
        })),
        revenueByEvent: topEvents.map((event) => ({
          eventId: event.id,
          eventName: event.name,
          revenue: Number(event.revenue) || 0,
          ticketsSold: Number(event.ticketsSold) || 0,
        })),
        bookingVelocity: recentBookings / 24, // Bookings per hour
        popularEventTimes: popularHours.map((h) => ({
          hour: Number(h.hour),
          bookings: Number(h.bookings),
        })),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get system analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get revenue analytics with time-based breakdown
   */
  async getRevenueAnalytics(
    timeRange: "7d" | "30d" | "90d" = "30d",
  ): Promise<RevenueAnalytics> {
    try {
      let startDate: Date;
      const now = new Date();

      switch (timeRange) {
        case "7d":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "30d":
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case "90d":
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 30));
      }

      // Daily revenue - no status filter
      const dailyRevenue = await db
        .select({
          date: sql<string>`DATE(${schema.bookings.createdAt})`,
          revenue: sql<number>`sum(${schema.bookings.totalAmount})`,
        })
        .from(schema.bookings)
        .where(gte(schema.bookings.createdAt, startDate))
        .groupBy(sql`DATE(${schema.bookings.createdAt})`)
        .orderBy(sql`DATE(${schema.bookings.createdAt})`);

      // Weekly revenue
      const weeklyRevenue = await db
        .select({
          week: sql<string>`TO_CHAR(${schema.bookings.createdAt}, 'YYYY-WW')`,
          revenue: sql<number>`sum(${schema.bookings.totalAmount})`,
        })
        .from(schema.bookings)
        .where(gte(schema.bookings.createdAt, startDate))
        .groupBy(sql`TO_CHAR(${schema.bookings.createdAt}, 'YYYY-WW')`)
        .orderBy(sql`TO_CHAR(${schema.bookings.createdAt}, 'YYYY-WW')`);

      // Monthly revenue
      const monthlyRevenue = await db
        .select({
          month: sql<string>`TO_CHAR(${schema.bookings.createdAt}, 'YYYY-MM')`,
          revenue: sql<number>`sum(${schema.bookings.totalAmount})`,
        })
        .from(schema.bookings)
        .where(gte(schema.bookings.createdAt, startDate))
        .groupBy(sql`TO_CHAR(${schema.bookings.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${schema.bookings.createdAt}, 'YYYY-MM')`);

      return {
        dailyRevenue: dailyRevenue.map((item) => ({
          date: item.date,
          revenue: Number(item.revenue) || 0,
        })),
        weeklyRevenue: weeklyRevenue.map((item) => ({
          week: item.week,
          revenue: Number(item.revenue) || 0,
        })),
        monthlyRevenue: monthlyRevenue.map((item) => ({
          month: item.month,
          revenue: Number(item.revenue) || 0,
        })),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get revenue analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get booking trends and patterns
   */
  async getBookingTrends(eventId?: string) {
    try {
      const baseQuery = eventId
        ? eq(schema.bookings.eventId, eventId)
        : undefined;

      // Bookings by day of week
      const byDayOfWeek = await db
        .select({
          day: sql<number>`EXTRACT(DOW FROM ${schema.bookings.createdAt})`,
          bookings: sql<number>`count(*)`,
        })
        .from(schema.bookings)
        .where(baseQuery)
        .groupBy(sql`EXTRACT(DOW FROM ${schema.bookings.createdAt})`)
        .orderBy(sql`EXTRACT(DOW FROM ${schema.bookings.createdAt})`);

      // Bookings by hour
      const byHour = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${schema.bookings.createdAt})`,
          bookings: sql<number>`count(*)`,
        })
        .from(schema.bookings)
        .where(baseQuery)
        .groupBy(sql`EXTRACT(HOUR FROM ${schema.bookings.createdAt})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${schema.bookings.createdAt})`);

      // Recent booking velocity
      const timeFrames = [1, 7, 30]; // hours, days
      const velocity = await Promise.all(
        timeFrames.map(async (timeframe) => {
          const startDate = new Date();
          if (timeframe === 1) {
            startDate.setHours(startDate.getHours() - 1);
          } else {
            startDate.setDate(startDate.getDate() - timeframe);
          }

          const query = baseQuery
            ? and(baseQuery, gte(schema.bookings.createdAt, startDate))
            : gte(schema.bookings.createdAt, startDate);

          const result = await db
            .select({ bookings: sql<number>`count(*)` })
            .from(schema.bookings)
            .where(query)
            .then((rows) => Number(rows[0].bookings) || 0);

          return {
            timeframe: `${timeframe}${timeframe === 1 ? "h" : "d"}`,
            bookings: result,
            rate: timeframe === 1 ? result : result / timeframe,
          };
        }),
      );

      return {
        byDayOfWeek: byDayOfWeek.map((item) => ({
          day: Number(item.day),
          dayName: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][Number(item.day)],
          bookings: Number(item.bookings),
        })),
        byHour: byHour.map((item) => ({
          hour: Number(item.hour),
          bookings: Number(item.bookings),
        })),
        velocity,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get booking trends: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
