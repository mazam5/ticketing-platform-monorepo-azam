import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../../../../packages/database/src";
import { CreateBooking } from "../../../../packages/database/src/schema";
import { PricingService } from "../pricing/pricing.service";
import { RedisService } from "../redis/redis.service";

export interface BookingWithEvent {
  id: string;
  eventId: string;
  ticketCount: number;
  customerEmail: string;
  totalAmount: number;
  createdAt: Date;
  eventName: string;
  eventDate: Date;
  eventVenue?: string;
  currentPrice?: number;
  pricePerTicket?: number;
}

export interface BookingStats {
  totalBookings: number;
  totalTickets: number;
  totalRevenue: number;
  averageTickets: number;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private readonly MAX_TICKETS_PER_BOOKING = 10;
  private readonly RATE_LIMIT_COUNT = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 60000;

  constructor(
    private readonly pricingService: PricingService,
    private readonly redisService: RedisService
  ) {}

  async create(createBookingDto: CreateBooking) {
    const { eventId, ticketCount, customerEmail } = createBookingDto;

    this.validateBookingInput(ticketCount, customerEmail);
    await this.checkRateLimit(customerEmail);

    try {
      return await db.transaction(async (tx) => {
        // Get event with FOR UPDATE to lock the row and include all necessary fields
        const [event] = await tx
          .select({
            id: schema.events.id,
            name: schema.events.name,
            date: schema.events.date,
            capacity: schema.events.capacity,
            bookedTickets: schema.events.bookedTickets,
            isActive: schema.events.isActive,
            currentPrice: schema.events.currentPrice,
            basePrice: schema.events.basePrice,
            floorPrice: schema.events.floorPrice,
            ceilingPrice: schema.events.ceilingPrice,
          })
          .from(schema.events)
          .where(eq(schema.events.id, eventId))
          .for("update");

        if (!event) {
          throw new NotFoundException("Event not found");
        }

        this.validateEventForBooking(event);

        // Check capacity
        const newBookedTickets = event.bookedTickets + ticketCount;
        if (newBookedTickets > event.capacity) {
          throw new ConflictException(
            `Not enough tickets available. Only ${event.capacity - event.bookedTickets} tickets remaining.`
          );
        }

        // Use current price from event or calculate fresh
        let pricePerTicket: number;
        const cachedPrice = await this.redisService.getEventPrice(eventId);

        if (cachedPrice !== null) {
          pricePerTicket = cachedPrice;
        } else {
          // Calculate price based on current demand
          pricePerTicket = await this.calculateDynamicPrice(event, ticketCount);
        }

        const totalAmount = pricePerTicket * ticketCount;

        // Create booking
        const [booking] = await tx
          .insert(schema.bookings)
          .values({
            eventId,
            ticketCount,
            customerEmail,
            totalAmount: totalAmount.toFixed(2),
          })
          .returning();

        // Update event booked tickets and price in a SINGLE query
        await tx.execute(sql`
          UPDATE events 
          SET 
            booked_tickets = booked_tickets + ${ticketCount},
            current_price = ${pricePerTicket.toFixed(2)},
            updated_at = NOW()
          WHERE id = ${eventId}
        `);

        // Update price cache
        await this.redisService.setEventPrice(eventId, pricePerTicket);

        // Clear all relevant caches
        await this.clearBookingCaches(eventId, customerEmail);

        return {
          ...booking,
          totalAmount: parseFloat(booking.totalAmount),
          pricePerTicket,
          eventName: event.name,
          eventDate: event.date,
        };
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to create booking: ${error.message}`,
        error.stack
      );
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to create booking");
    }
  }

  async findByEvent(eventId: string): Promise<BookingWithEvent[]> {
    const cacheKey = `bookings:event:${eventId}`;

    try {
      const cached = await this.redisService.get<BookingWithEvent[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const bookingsWithEvents = await db
        .select({
          id: schema.bookings.id,
          eventId: schema.bookings.eventId,
          ticketCount: schema.bookings.ticketCount,
          customerEmail: schema.bookings.customerEmail,
          totalAmount: schema.bookings.totalAmount,
          createdAt: schema.bookings.createdAt,
          eventName: schema.events.name,
          eventDate: schema.events.date,
          eventVenue: schema.events.venue,
        })
        .from(schema.bookings)
        .innerJoin(schema.events, eq(schema.bookings.eventId, schema.events.id))
        .where(eq(schema.bookings.eventId, eventId))
        .orderBy(desc(schema.bookings.createdAt));

      const result: BookingWithEvent[] = bookingsWithEvents.map((booking) => ({
        ...booking,
        totalAmount: parseFloat(booking.totalAmount),
      }));

      await this.redisService.set(cacheKey, result, 120);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to find bookings by event: ${error.message}`);
      throw new InternalServerErrorException("Failed to retrieve bookings");
    }
  }

  async findByCustomer(email: string): Promise<BookingWithEvent[]> {
    const cacheKey = `bookings:customer:${email}`;

    try {
      const cached = await this.redisService.get<BookingWithEvent[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const bookingsWithEvents = await db
        .select({
          id: schema.bookings.id,
          eventId: schema.bookings.eventId,
          ticketCount: schema.bookings.ticketCount,
          customerEmail: schema.bookings.customerEmail,
          totalAmount: schema.bookings.totalAmount,
          createdAt: schema.bookings.createdAt,
          eventName: schema.events.name,
          eventDate: schema.events.date,
          eventVenue: schema.events.venue,
          currentPrice: schema.events.currentPrice,
        })
        .from(schema.bookings)
        .innerJoin(schema.events, eq(schema.bookings.eventId, schema.events.id))
        .where(eq(schema.bookings.customerEmail, email))
        .orderBy(desc(schema.bookings.createdAt));

      const result: BookingWithEvent[] = bookingsWithEvents.map((booking) => ({
        ...booking,
        totalAmount: parseFloat(booking.totalAmount),
        currentPrice: booking.currentPrice
          ? parseFloat(booking.currentPrice)
          : undefined,
      }));

      await this.redisService.set(cacheKey, result, 120);
      return result;
    } catch (error: any) {
      this.logger.error(
        `Failed to find bookings by customer: ${error.message}`
      );
      throw new InternalServerErrorException(
        "Failed to retrieve customer bookings"
      );
    }
  }

  async getBookingStats(eventId: string): Promise<BookingStats> {
    const cacheKey = `booking_stats:${eventId}`;

    try {
      const cached = await this.redisService.get<BookingStats>(cacheKey);
      if (cached) {
        return cached;
      }

      const stats = await db
        .select({
          totalBookings: sql<number>`count(*)`,
          totalTickets: sql<number>`sum(${schema.bookings.ticketCount})`,
          totalRevenue: sql<number>`sum(${schema.bookings.totalAmount})`,
          averageTickets: sql<number>`avg(${schema.bookings.ticketCount})`,
        })
        .from(schema.bookings)
        .where(eq(schema.bookings.eventId, eventId))
        .then((rows) => rows[0]);

      const result: BookingStats = {
        totalBookings: Number(stats.totalBookings) || 0,
        totalTickets: Number(stats.totalTickets) || 0,
        totalRevenue: Number(stats.totalRevenue) || 0,
        averageTickets:
          Math.round(Number(stats.averageTickets) * 100) / 100 || 0,
      };

      await this.redisService.set(cacheKey, result, 60);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to get booking stats: ${error.message}`);
      throw new InternalServerErrorException(
        "Failed to retrieve booking statistics"
      );
    }
  }

  async cancelBooking(bookingId: string, customerEmail: string) {
    try {
      return await db.transaction(async (tx) => {
        // Get booking details
        const [booking] = await tx
          .select()
          .from(schema.bookings)
          .where(eq(schema.bookings.id, bookingId));

        if (!booking) {
          throw new NotFoundException("Booking not found");
        }

        if (booking.customerEmail !== customerEmail) {
          throw new BadRequestException(
            "You can only cancel your own bookings"
          );
        }

        // Get event details
        const [event] = await tx
          .select()
          .from(schema.events)
          .where(eq(schema.events.id, booking.eventId));

        // Check if event has already occurred
        if (event && new Date() > event.date) {
          throw new BadRequestException(
            "Cannot cancel booking for an event that has already occurred"
          );
        }

        // Delete the booking (since no status field)
        await tx
          .delete(schema.bookings)
          .where(eq(schema.bookings.id, bookingId));

        // Update event tickets and recalculate price if event exists
        if (event) {
          const newBookedTickets = event.bookedTickets - booking.ticketCount;
          const newPrice = await this.calculateDynamicPrice(
            event,
            -booking.ticketCount
          );

          await tx.execute(sql`
            UPDATE events 
            SET 
              booked_tickets = ${newBookedTickets},
              current_price = ${newPrice.toFixed(2)},
              updated_at = NOW()
            WHERE id = ${booking.eventId}
          `);

          // Update price cache
          await this.redisService.setEventPrice(booking.eventId, newPrice);
        }

        // Clear caches
        await this.clearBookingCaches(
          booking.eventId,
          customerEmail,
          bookingId
        );

        return {
          id: bookingId,
          status: "cancelled",
          refundAmount: parseFloat(booking.totalAmount),
          message: "Booking cancelled successfully",
        };
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to cancel booking: ${error.message}`,
        error.stack
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to cancel booking");
    }
  }

  // Private helper methods
  private validateBookingInput(
    ticketCount: number,
    customerEmail: string
  ): void {
    if (ticketCount <= 0) {
      throw new BadRequestException("Ticket count must be greater than 0");
    }

    if (ticketCount > this.MAX_TICKETS_PER_BOOKING) {
      throw new BadRequestException(
        `Cannot book more than ${this.MAX_TICKETS_PER_BOOKING} tickets at once`
      );
    }

    if (!customerEmail || !this.isValidEmail(customerEmail)) {
      throw new BadRequestException("Valid email is required");
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async checkRateLimit(customerEmail: string): Promise<void> {
    const rateLimitKey = `rate_limit:${customerEmail}`;
    const canProceed = await this.redisService.checkRateLimit(
      rateLimitKey,
      this.RATE_LIMIT_COUNT,
      this.RATE_LIMIT_WINDOW_MS
    );

    if (!canProceed) {
      throw new BadGatewayException(
        "Too many booking attempts. Please try again in a minute."
      );
    }
  }

  private validateEventForBooking(event: any): void {
    if (!event.isActive) {
      throw new BadRequestException("Event is not active");
    }

    if (new Date() > event.date) {
      throw new BadRequestException("Event has already occurred");
    }
  }

  private async calculateDynamicPrice(
    event: any,
    ticketCountChange: number
  ): Promise<number> {
    // Simple dynamic pricing algorithm based on demand
    const basePrice = parseFloat(event.basePrice);
    const floorPrice = parseFloat(event.floorPrice);
    const ceilingPrice = parseFloat(event.ceilingPrice);
    const capacity = event.capacity;
    const currentBooked = event.bookedTickets;

    // Calculate new booked tickets after this operation
    const newBookedTickets = currentBooked + ticketCountChange;
    const utilizationRate = newBookedTickets / capacity;

    // Increase price as utilization increases (simple linear model)
    let newPrice =
      basePrice *
      (1 +
        utilizationRate * (Number(process.env.HIGH_UTILIZATION_WEIGHT) || 1)); // 50% max increase

    // Ensure price stays within bounds
    newPrice = Math.max(floorPrice, Math.min(ceilingPrice, newPrice));

    return Math.round(newPrice * 100) / 100; // Round to 2 decimal places
  }

  private async getCurrentPrice(eventId: string): Promise<number> {
    const cachedPrice = await this.redisService.getEventPrice(eventId);
    if (cachedPrice !== null) {
      return cachedPrice;
    }

    // Get current event data for price calculation
    const [event] = await db
      .select({
        basePrice: schema.events.basePrice,
        floorPrice: schema.events.floorPrice,
        ceilingPrice: schema.events.ceilingPrice,
        capacity: schema.events.capacity,
        bookedTickets: schema.events.bookedTickets,
      })
      .from(schema.events)
      .where(eq(schema.events.id, eventId));

    if (!event) {
      throw new NotFoundException("Event not found for price calculation");
    }

    const price = await this.calculateDynamicPrice(event, 0);
    await this.redisService.setEventPrice(eventId, price);
    return price;
  }

  private async clearBookingCaches(
    eventId: string,
    customerEmail: string,
    bookingId?: string
  ): Promise<void> {
    const cacheKeys = [
      `events:${eventId}`,
      "events:all",
      `bookings:event:${eventId}`,
      `bookings:customer:${customerEmail}`,
      `booking_stats:${eventId}`,
      `event_price:${eventId}`,
    ];

    if (bookingId) {
      cacheKeys.push(`booking:${bookingId}`);
    }

    await Promise.allSettled(
      cacheKeys.map((key) => this.redisService.del(key))
    );
  }
}
