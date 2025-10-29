import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createEventSchema } from "@repo/database/src/schema";
import { AdminAuthGuard } from "../common/guards/admin-auth-guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation-pipes";
import { EventsService } from "./events.service";

// Define more specific interfaces
interface Booking {
  id: string;
  eventId: string;
  customerEmail: string;
  ticketCount: number;
  totalAmount: string;
  status: string;
  createdAt: Date;
}

interface EventResponse {
  id: string;
  name: string;
  date: Date;
  venue: string;
  description?: string;
  capacity: number;
  bookedTickets: number;
  basePrice: number;
  currentPrice: number;
  floorPrice: number;
  ceilingPrice: number;
  isActive: boolean;
  pricingRules: {
    timeBased: { weight: number; adjustmentRate: number };
    demandBased: { weight: number; adjustmentRate: number };
    inventoryBased: { weight: number; adjustmentRate: number };
  };
  createdAt: Date;
  updatedAt: Date;
  priceBreakdown?: any;
  bookings?: Booking[];
}

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(AdminAuthGuard)
  async findAll() {
    try {
      const events = (await this.eventsService.findAll()) as EventResponse[];
      return {
        success: true,
        data: events,
        message: "Events retrieved successfully",
        count: events.length,
      };
    } catch (error) {
      throw new BadRequestException("Failed to retrieve events");
    }
  }

  @Get(":id")
  @UseGuards(AdminAuthGuard)
  async findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    try {
      const event = (await this.eventsService.findOne(id)) as EventResponse;
      return {
        success: true,
        data: event,
        message: "Event retrieved successfully",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to retrieve event");
    }
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  async create(
    @Body(new ZodValidationPipe(createEventSchema))
    createEventDto: any
  ) {
    try {
      const event = (await this.eventsService.create(
        createEventDto
      )) as EventResponse;
      return {
        success: true,
        data: event,
        message: "Event created successfully",
        statusCode: HttpStatus.CREATED,
      };
    } catch (error) {
      throw new BadRequestException("Failed to create event");
    }
  }

  @Patch(":id/update-price")
  async updatePrice(@Param("id", new ParseUUIDPipe()) id: string) {
    try {
      const event = (await this.eventsService.updatePrice(id)) as EventResponse;
      return {
        success: true,
        data: event,
        message: "Event price updated successfully",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to update event price");
    }
  }

  @Get(":id/availability")
  async getAvailability(@Param("id", new ParseUUIDPipe()) id: string) {
    try {
      const event = (await this.eventsService.findOne(id)) as EventResponse;

      const availability = {
        totalCapacity: event.capacity,
        bookedTickets: event.bookedTickets,
        availableTickets: event.capacity - event.bookedTickets,
        isSoldOut: event.capacity - event.bookedTickets === 0,
        availabilityPercentage: (event.bookedTickets / event.capacity) * 100,
        currentPrice: event.currentPrice,
        isActive: event.isActive,
        eventDate: event.date,
      };

      return {
        success: true,
        data: availability,
        message: "Event availability retrieved successfully",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to retrieve event availability");
    }
  }

  @Get(":id/price-breakdown")
  async getPriceBreakdown(@Param("id", new ParseUUIDPipe()) id: string) {
    try {
      const event = (await this.eventsService.findOne(id)) as EventResponse;

      return {
        success: true,
        data: {
          eventId: event.id,
          eventName: event.name,
          basePrice: event.basePrice,
          currentPrice: event.currentPrice,
          floorPrice: event.floorPrice,
          ceilingPrice: event.ceilingPrice,
          priceBreakdown: event.priceBreakdown,
          pricingRules: event.pricingRules,
        },
        message: "Price breakdown retrieved successfully",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to retrieve price breakdown");
    }
  }

  @Get(":id/bookings")
  async getEventBookings(@Param("id", new ParseUUIDPipe()) id: string) {
    try {
      const event = (await this.eventsService.findOne(id)) as EventResponse;

      // Safe type checking for bookings
      const bookings: Booking[] = event.bookings || [];
      const totalBookings = bookings.length;
      const totalRevenue = bookings.reduce((sum: number, booking: Booking) => {
        return sum + (parseFloat(booking.totalAmount) || 0);
      }, 0);
      const averageBookingValue =
        totalBookings > 0 ? totalRevenue / totalBookings : 0;

      return {
        success: true,
        data: {
          eventId: event.id,
          eventName: event.name,
          bookings: bookings,
          totalBookings: totalBookings,
          totalRevenue: totalRevenue,
          averageBookingValue: averageBookingValue,
        },
        message: "Event bookings retrieved successfully",
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException("Failed to retrieve event bookings");
    }
  }

  @Post("cache/clear")
  @UseGuards(AdminAuthGuard)
  async clearCache() {
    try {
      await this.eventsService.invalidateCache();
      return {
        success: true,
        message: "Event cache cleared successfully",
      };
    } catch (error) {
      throw new BadRequestException("Failed to clear cache");
    }
  }

  @Get("health/check")
  async healthCheck() {
    try {
      const events = (await this.eventsService.findAll()) as EventResponse[];

      // Safe type checking with proper array methods
      const totalEvents = events.length;
      const activeEvents = events.filter(
        (e: EventResponse) => e.isActive
      ).length;
      const upcomingEvents = events.filter(
        (e: EventResponse) => new Date(e.date) > new Date()
      ).length;

      return {
        success: true,
        data: {
          totalEvents: totalEvents,
          activeEvents: activeEvents,
          upcomingEvents: upcomingEvents,
          cacheStatus: "operational",
        },
        message: "Events service is healthy",
      };
    } catch (error) {
      return {
        success: false,
        data: {
          totalEvents: 0,
          activeEvents: 0,
          upcomingEvents: 0,
          cacheStatus: "error",
        },
        message: "Events service health check failed",
      };
    }
  }
}
