import { db } from "./index";
import { events, bookings } from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data in correct order (respecting foreign keys)
    await db.delete(bookings);
    await db.delete(events);

    // Insert sample events
    const eventData = [
      {
        name: "Next.js Conference 2025",
        date: new Date("2025-12-01T10:00:00Z"),
        venue: "San Francisco Convention Center",
        description:
          "Annual conference about React and Next.js featuring the latest updates and best practices",
        capacity: 200,
        bookedTickets: 45,
        basePrice: "100.00",
        currentPrice: "115.50",
        floorPrice: "80.00",
        ceilingPrice: "250.00",
        pricingRules: {
          timeBased: { weight: 0.5, adjustmentRate: 0.1 },
          demandBased: { weight: 0.3, adjustmentRate: 0.15 },
          inventoryBased: { weight: 0.2, adjustmentRate: 0.08 },
        },
      },
      {
        name: "NestJS Summit 2025",
        date: new Date("2025-11-20T09:00:00Z"),
        venue: "New York City Tech Center",
        description:
          "Deep dive into NestJS and backend architecture with expert speakers",
        capacity: 150,
        bookedTickets: 120,
        basePrice: "120.00",
        currentPrice: "185.75",
        floorPrice: "90.00",
        ceilingPrice: "300.00",
        pricingRules: {
          timeBased: { weight: 0.6, adjustmentRate: 0.12 },
          demandBased: { weight: 0.2, adjustmentRate: 0.18 },
          inventoryBased: { weight: 0.2, adjustmentRate: 0.1 },
        },
      },
    ];

    const insertedEvents = await db
      .insert(events)
      .values(eventData)
      .returning();
    console.log(`✅ Inserted ${insertedEvents.length} events`);

    // Insert sample bookings - fix the status field issue
    if (insertedEvents[0]) {
      const bookingData = [
        {
          eventId: insertedEvents[0].id,
          customerEmail: "john.doe@example.com",
          ticketCount: 2,
          totalAmount: "231.00",
        },
        {
          eventId: insertedEvents[0].id,
          customerEmail: "jane.smith@example.com",
          ticketCount: 1,
          totalAmount: "115.50",
        },
      ];

      await db.insert(bookings).values(bookingData);
      console.log("✅ Inserted sample bookings");
    }

    console.log("🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Handle script execution
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seed };
