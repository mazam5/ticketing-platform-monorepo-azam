import { Injectable } from "@nestjs/common";
import { CreateEventDto } from "./dto/create-event.dto";

@Injectable()
export class EventsService {
  create(createEventDto: CreateEventDto) {
    return "This action adds a new event";
  }

  findAll() {
    return `This action returns all events`;
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }
}
