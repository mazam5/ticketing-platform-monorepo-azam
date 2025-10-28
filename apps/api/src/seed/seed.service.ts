import { Injectable } from "@nestjs/common";
import { CreateSeedDto } from "./dto/create-seed.dto";

@Injectable()
export class SeedService {
  create(createSeedDto: CreateSeedDto) {
    return "This action adds a new seed";
  }

  findAll() {
    return `This action returns all seed`;
  }

  findOne(id: number) {
    return `This action returns a #${id} seed`;
  }
}
