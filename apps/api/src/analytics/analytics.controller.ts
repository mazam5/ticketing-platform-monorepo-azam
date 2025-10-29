import { Controller, Get, Param, Query } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("events/:id")
  async getEventAnalytics(@Param("id") eventId: string) {
    const data = await this.analyticsService.getEventAnalytics(eventId);
    return {
      success: true,
      data,
      message: "Event analytics retrieved successfully",
    };
  }

  @Get("summary")
  async getSystemAnalytics() {
    const data = await this.analyticsService.getSystemAnalytics();
    return {
      success: true,
      data,
      message: "System analytics retrieved successfully",
    };
  }

  @Get("revenue")
  async getRevenueAnalytics(
    @Query("range") range: "7d" | "30d" | "90d" = "30d",
  ) {
    const data = await this.analyticsService.getRevenueAnalytics(range);
    return {
      success: true,
      data,
      message: "Revenue analytics retrieved successfully",
    };
  }

  @Get("trends")
  async getBookingTrends(@Query("eventId") eventId?: string) {
    const data = await this.analyticsService.getBookingTrends(eventId);
    return {
      success: true,
      data,
      message: "Booking trends retrieved successfully",
    };
  }
}
