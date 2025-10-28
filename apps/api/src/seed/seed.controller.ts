import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { SeedService } from "./seed.service";
import { CreateSeedDto } from "./dto/create-seed.dto";

@Controller("seed")
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  create(@Body() createSeedDto: CreateSeedDto) {
    return this.seedService.create(createSeedDto);
  }
}
