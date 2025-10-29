import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  timestamp,
  jsonb,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Event table
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  date: timestamp("date", { mode: "date" }).notNull(),
  venue: varchar("venue", { length: 255 }).notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull(),
  bookedTickets: integer("booked_tickets").notNull().default(0),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
  floorPrice: numeric("floor_price", { precision: 10, scale: 2 }).notNull(),
  ceilingPrice: numeric("ceiling_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  pricingRules: jsonb("pricing_rules")
    .$type<{
      timeBased: { weight: number; adjustmentRate: number };
      demandBased: { weight: number; adjustmentRate: number };
      inventoryBased: { weight: number; adjustmentRate: number };
    }>()
    .notNull()
    .default({
      timeBased: { weight: 0.33, adjustmentRate: 0.1 },
      demandBased: { weight: 0.33, adjustmentRate: 0.1 },
      inventoryBased: { weight: 0.34, adjustmentRate: 0.1 },
    }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// Booking table
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  ticketCount: integer("ticket_count").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("confirmed"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
}));

// Manual Zod schemas (avoiding drizzle-zod compatibility issues)
export const pricingRulesSchema = z
  .object({
    timeBased: z.object({
      weight: z.number().min(0).max(1),
      adjustmentRate: z.number().min(0).max(1),
    }),
    demandBased: z.object({
      weight: z.number().min(0).max(1),
      adjustmentRate: z.number().min(0).max(1),
    }),
    inventoryBased: z.object({
      weight: z.number().min(0).max(1),
      adjustmentRate: z.number().min(0).max(1),
    }),
  })
  .refine(
    (data) => {
      const totalWeight =
        data.timeBased.weight +
        data.demandBased.weight +
        data.inventoryBased.weight;
      return Math.abs(totalWeight - 1) < 0.01; // Allow small floating point errors
    },
    {
      message: "Pricing rule weights must sum to 1",
    }
  );

export const createEventSchema = z.object({
  name: z.string().min(1).max(255),
  date: z.coerce.date().min(new Date()),
  venue: z.string().min(1).max(255),
  description: z.string().optional(),
  capacity: z.number().int().positive(),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  floorPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  ceilingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  pricingRules: pricingRulesSchema,
});

export const createBookingSchema = z.object({
  eventId: z.uuid(),
  customerEmail: z.email(),
  ticketCount: z.number().int().positive().max(10),
  amountPaid: z.number().int().positive(),
});

// Types
export type Event = typeof events.$inferSelect;
export type CreateEvent = z.infer<typeof createEventSchema>;
export type Booking = typeof bookings.$inferSelect;
export type CreateBooking = z.infer<typeof createBookingSchema>;
export type PricingRules = z.infer<typeof pricingRulesSchema>;
