import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../../../../packages/database/src/index";

export interface PriceCalculationResult {
  basePrice: number;
  timeBasedAdjustment: number;
  demandBasedAdjustment: number;
  inventoryBasedAdjustment: number;
  totalAdjustment: number;
  finalPrice: number;
  adjustments: {
    timeBased: {
      adjustment: number;
      weight: number;
      weightedAdjustment: number;
    };
    demandBased: {
      adjustment: number;
      weight: number;
      weightedAdjustment: number;
    };
    inventoryBased: {
      adjustment: number;
      weight: number;
      weightedAdjustment: number;
    };
  };
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  async calculateCurrentPrice(
    eventId: string,
  ): Promise<PriceCalculationResult> {
    const [event] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, eventId));

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const basePrice = parseFloat(event.basePrice);
    const floorPrice = parseFloat(event.floorPrice);
    const ceilingPrice = parseFloat(event.ceilingPrice);
    const pricingRules = event.pricingRules;

    // Calculate individual adjustments
    const timeBasedAdjustment = this.calculateTimeBasedAdjustment(
      event.date,
      pricingRules.timeBased,
    );
    const demandBasedAdjustment = await this.calculateDemandBasedAdjustment(
      eventId,
      pricingRules.demandBased,
    );
    const inventoryBasedAdjustment = this.calculateInventoryBasedAdjustment(
      event.bookedTickets,
      event.capacity,
      pricingRules.inventoryBased,
    );

    // Calculate weighted adjustments
    const timeBasedWeighted =
      timeBasedAdjustment * pricingRules.timeBased.weight;
    const demandBasedWeighted =
      demandBasedAdjustment * pricingRules.demandBased.weight;
    const inventoryBasedWeighted =
      inventoryBasedAdjustment * pricingRules.inventoryBased.weight;

    // Calculate total adjustment
    const totalAdjustment =
      timeBasedWeighted + demandBasedWeighted + inventoryBasedWeighted;

    // Calculate final price with constraints
    let finalPrice = basePrice * (1 + totalAdjustment);
    finalPrice = Math.max(floorPrice, Math.min(ceilingPrice, finalPrice));

    return {
      basePrice,
      timeBasedAdjustment,
      demandBasedAdjustment,
      inventoryBasedAdjustment,
      totalAdjustment,
      finalPrice: parseFloat(finalPrice.toFixed(2)),
      adjustments: {
        timeBased: {
          adjustment: timeBasedAdjustment,
          weight: pricingRules.timeBased.weight,
          weightedAdjustment: timeBasedWeighted,
        },
        demandBased: {
          adjustment: demandBasedAdjustment,
          weight: pricingRules.demandBased.weight,
          weightedAdjustment: demandBasedWeighted,
        },
        inventoryBased: {
          adjustment: inventoryBasedAdjustment,
          weight: pricingRules.inventoryBased.weight,
          weightedAdjustment: inventoryBasedWeighted,
        },
      },
    };
  }

  private calculateTimeBasedAdjustment(
    eventDate: Date,
    rule: { adjustmentRate: number },
  ): number {
    const now = new Date();
    const timeUntilEvent = eventDate.getTime() - now.getTime();

    // If event is in the past, return maximum adjustment
    if (timeUntilEvent < 0) {
      return rule.adjustmentRate * 5; // Maximum adjustment for past events
    }

    const daysUntilEvent = timeUntilEvent / (1000 * 60 * 60 * 24);

    if (daysUntilEvent <= 1) {
      return rule.adjustmentRate * 5; // +50% for events tomorrow or today
    } else if (daysUntilEvent <= 7) {
      return rule.adjustmentRate * 2; // +20% for events within 7 days
    } else if (daysUntilEvent <= 30) {
      return rule.adjustmentRate; // +10% for events within 30 days
    }

    return 0; // Base price for events more than 30 days out
  }

  private async calculateDemandBasedAdjustment(
    eventId: string,
    rule: { adjustmentRate: number },
  ): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const recentBookings = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.eventId, eventId),
            sql`${schema.bookings.createdAt} >= ${oneHourAgo}`,
          ),
        );

      const bookingCount = recentBookings[0]?.count || 0;

      if (bookingCount > 20) {
        return rule.adjustmentRate * 3; // +30% for very high demand (>20 bookings/hour)
      } else if (bookingCount > 10) {
        return rule.adjustmentRate * 2; // +20% for high demand (>10 bookings/hour)
      } else if (bookingCount > 5) {
        return rule.adjustmentRate; // +10% for moderate demand (>5 bookings/hour)
      }

      return 0; // No adjustment for low demand
    } catch (error) {
      this.logger.error(
        `Error calculating demand-based adjustment for event ${eventId}:`,
        error,
      );
      return 0; // Return no adjustment on error
    }
  }

  private calculateInventoryBasedAdjustment(
    bookedTickets: number,
    capacity: number,
    rule: { adjustmentRate: number },
  ): number {
    if (capacity === 0) return 0; // Prevent division by zero

    const remainingTickets = capacity - bookedTickets;
    const inventoryRatio = remainingTickets / capacity;

    if (inventoryRatio <= 0.1) {
      // Less than 10% remaining
      return rule.adjustmentRate * 3; // +30%
    } else if (inventoryRatio <= 0.2) {
      // Less than 20% remaining
      return rule.adjustmentRate * 2.5; // +25%
    } else if (inventoryRatio <= 0.5) {
      // Less than 50% remaining
      return rule.adjustmentRate; // +10%
    }

    return 0; // No adjustment for high inventory
  }

  async updateEventPrice(eventId: string): Promise<void> {
    try {
      const priceCalculation = await this.calculateCurrentPrice(eventId);

      // Remove updatedAt from the update - Drizzle handles this automatically
      await db
        .update(schema.events)
        .set({
          currentPrice: priceCalculation.finalPrice.toFixed(2),
        })
        .where(eq(schema.events.id, eventId));

      this.logger.log(
        `Updated price for event ${eventId}: $${priceCalculation.finalPrice}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update price for event ${eventId}:`, error);
      throw error;
    }
  }

  async calculatePriceForBooking(
    eventId: string,
    ticketCount: number,
  ): Promise<{
    pricePerTicket: number;
    totalAmount: number;
    breakdown: PriceCalculationResult;
  }> {
    const breakdown = await this.calculateCurrentPrice(eventId);
    const totalAmount = breakdown.finalPrice * ticketCount;

    return {
      pricePerTicket: breakdown.finalPrice,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      breakdown,
    };
  }

  async batchUpdatePrices(eventIds?: string[]): Promise<void> {
    try {
      let eventsToUpdate;

      if (eventIds && eventIds.length > 0) {
        eventsToUpdate = await db
          .select()
          .from(schema.events)
          .where(
            sql`${schema.events.id} IN (${eventIds.map((id) => sql`${id}`)})`,
          );
      } else {
        // Update all active future events
        eventsToUpdate = await db
          .select()
          .from(schema.events)
          .where(
            and(
              eq(schema.events.isActive, true),
              sql`${schema.events.date} > NOW()`,
            ),
          );
      }

      this.logger.log(`Updating prices for ${eventsToUpdate.length} events`);

      for (const event of eventsToUpdate) {
        try {
          await this.updateEventPrice(event.id);
        } catch (error) {
          this.logger.error(
            `Failed to update price for event ${event.id}:`,
            error,
          );
          // Continue with other events even if one fails
        }
      }

      this.logger.log("Batch price update completed");
    } catch (error) {
      this.logger.error("Batch price update failed:", error);
      throw error;
    }
  }

  // Utility method to get pricing statistics
  async getPricingStats(eventId: string): Promise<{
    currentPrice: number;
    basePrice: number;
    floorPrice: number;
    ceilingPrice: number;
    priceChangePercentage: number;
  }> {
    const [event] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, eventId));

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const currentPrice = parseFloat(event.currentPrice);
    const basePrice = parseFloat(event.basePrice);
    const priceChangePercentage =
      ((currentPrice - basePrice) / basePrice) * 100;

    return {
      currentPrice,
      basePrice,
      floorPrice: parseFloat(event.floorPrice),
      ceilingPrice: parseFloat(event.ceilingPrice),
      priceChangePercentage: parseFloat(priceChangePercentage.toFixed(2)),
    };
  }

  // Method to simulate price changes over time (for testing/demo)
  async simulatePriceChange(
    eventId: string,
    hoursFromNow: number,
  ): Promise<number> {
    const [event] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, eventId));

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Create a simulated date for calculation
    const simulatedDate = new Date(event.date);
    simulatedDate.setHours(simulatedDate.getHours() - hoursFromNow);

    const basePrice = parseFloat(event.basePrice);
    const floorPrice = parseFloat(event.floorPrice);
    const ceilingPrice = parseFloat(event.ceilingPrice);
    const pricingRules = event.pricingRules;

    // Calculate adjustments with simulated time
    const timeBasedAdjustment = this.calculateTimeBasedAdjustment(
      simulatedDate,
      pricingRules.timeBased,
    );
    const demandBasedAdjustment = await this.calculateDemandBasedAdjustment(
      eventId,
      pricingRules.demandBased,
    );
    const inventoryBasedAdjustment = this.calculateInventoryBasedAdjustment(
      event.bookedTickets,
      event.capacity,
      pricingRules.inventoryBased,
    );

    const totalAdjustment =
      timeBasedAdjustment * pricingRules.timeBased.weight +
      demandBasedAdjustment * pricingRules.demandBased.weight +
      inventoryBasedAdjustment * pricingRules.inventoryBased.weight;

    let simulatedPrice = basePrice * (1 + totalAdjustment);
    simulatedPrice = Math.max(
      floorPrice,
      Math.min(ceilingPrice, simulatedPrice),
    );

    return parseFloat(simulatedPrice.toFixed(2));
  }
}
