import { Injectable } from "@nestjs/common";

@Injectable()
export class AnalyticsService {
  findAll() {
    return `This action returns all analytics`;
  }

  findOne(id: number) {
    return `This action returns a #${id} analytics`;
  }

  remove(id: number) {
    return `This action removes a #${id} analytics`;
  }
}
