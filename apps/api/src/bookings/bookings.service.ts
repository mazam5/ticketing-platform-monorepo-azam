import { Injectable } from "@nestjs/common";
import { CreateBookingDto } from "./dto/create-booking.dto";

@Injectable()
export class BookingsService {
  create(createBookingDto: CreateBookingDto) {
    return "This action adds a new booking";
  }

  findAll() {
    return `This action returns all bookings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }
}
