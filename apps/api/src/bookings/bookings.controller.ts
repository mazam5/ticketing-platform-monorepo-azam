import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  BadRequestException,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  BookingsService,
  BookingWithEvent,
  BookingStats,
} from "./bookings.service";
import { ZodValidationPipe } from "../common/pipes/zod-validation-pipes";
import { createBookingSchema } from "../../../../packages/database/src/schema";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createBookingSchema))
    createBookingDto: any,
  ) {
    return this.bookingsService.create(createBookingDto);
  }

  @Get()
  async findByEvent(
    @Query("eventId", ParseUUIDPipe) eventId: string,
  ): Promise<BookingWithEvent[]> {
    if (!eventId) {
      throw new BadRequestException("eventId query parameter is required");
    }
    return this.bookingsService.findByEvent(eventId);
  }

  @Get("customer")
  async findByCustomer(
    @Query("email") email: string,
  ): Promise<BookingWithEvent[]> {
    if (!email) {
      throw new BadRequestException("Email query parameter is required");
    }
    return this.bookingsService.findByCustomer(email);
  }

  @Get("stats/:eventId")
  async getBookingStats(
    @Param("eventId", ParseUUIDPipe) eventId: string,
  ): Promise<BookingStats> {
    return this.bookingsService.getBookingStats(eventId);
  }

  @Delete(":id")
  async cancelBooking(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("email") email: string,
  ) {
    if (!email) {
      throw new BadRequestException(
        "Email query parameter is required for cancellation",
      );
    }
    return this.bookingsService.cancelBooking(id, email);
  }
}
