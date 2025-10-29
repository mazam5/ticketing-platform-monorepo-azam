export interface Event {
  id: string;
  name: string;
  date: Date;
  venue: string;
  description: string;
  capacity: number;
  bookedTickets: number;
  basePrice: number;
  currentPrice: number;
  floorPrice: number;
  ceilingPrice: number;
  isActive: boolean;
  pricingRules: {
    timeBased: {
      weight: number;
      adjustmentRate: number;
    };
    demandBased: {
      weight: number;
      adjustmentRate: number;
    };
    inventoryBased: {
      weight: number;
      adjustmentRate: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  eventId: string;
  ticketCount: number;
  customerEmail: string;
  totalAmount: number;
  createdAt: Date;
  currentPrice: number;
  eventName: string;
  eventDate: Date;
  eventVenue: string;
}
