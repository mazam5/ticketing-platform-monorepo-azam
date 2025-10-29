import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gt } from "drizzle-orm";
import { db, schema } from "../../../../packages/database/src";
import { CreateEvent } from "../../../../packages/database/src/schema";
import { PricingService } from "../pricing/pricing.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class EventsService {
  constructor(
    private readonly pricingService: PricingService,
    private readonly redisService: RedisService,
  ) {}

  async findAll() {
    const cacheKey = "events:all";
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const events = await db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.isActive, true),
          gt(schema.events.date, new Date()),
        ),
      )
      .orderBy(asc(schema.events.date));

    const result = events.map((event) => ({
      ...event,
      basePrice: parseFloat(event.basePrice),
      currentPrice: parseFloat(event.currentPrice),
      floorPrice: parseFloat(event.floorPrice),
      ceilingPrice: parseFloat(event.ceilingPrice),
    }));

    await this.redisService.set(cacheKey, result, 60); // Cache for 1 minute
    return result;
  }

  async findOne(id: string) {
    const cached = await this.redisService.getEvent(id);
    if (cached) {
      return cached;
    }

    const [event] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, id));

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Get bookings for this event
    const eventBookings = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.eventId, id));

    const priceBreakdown = await this.pricingService.calculateCurrentPrice(id);

    const result = {
      ...event,
      basePrice: parseFloat(event.basePrice),
      currentPrice: parseFloat(event.currentPrice),
      floorPrice: parseFloat(event.floorPrice),
      ceilingPrice: parseFloat(event.ceilingPrice),
      priceBreakdown,
      bookings: eventBookings,
    };

    await this.redisService.setEvent(id, result);
    return result;
  }

  async create(createEventDto: CreateEvent) {
    const [event] = await db
      .insert(schema.events)
      .values({
        ...createEventDto,
        currentPrice: createEventDto.basePrice,
      })
      .returning();

    // Invalidate events cache
    await this.redisService.del("events:all");

    return {
      ...event,
      basePrice: parseFloat(event.basePrice),
      currentPrice: parseFloat(event.currentPrice),
      floorPrice: parseFloat(event.floorPrice),
      ceilingPrice: parseFloat(event.ceilingPrice),
    };
  }

  async updatePrice(eventId: string) {
    await this.pricingService.updateEventPrice(eventId);

    // Invalidate caches
    await this.redisService.invalidateEvent(eventId);
    await this.redisService.del("events:all");

    return this.findOne(eventId);
  }

  async invalidateCache(): Promise<void> {
    await this.redisService.reset();
  }
}
