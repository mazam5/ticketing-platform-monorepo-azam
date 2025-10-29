import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, TrendingUp, Clock, Zap } from "lucide-react";
import { notFound } from "next/navigation";
import { BookingForm } from "./BookingForm";
import { format } from "date-fns";
import { Event } from "utils/types";

async function getEvent(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const res = await fetch(`${apiUrl}/api/events/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = await res.json();
  const event: Event = data.data;
  return event;
}

export default async function EventDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEvent(params.id);
  if (!event) return notFound();

  const remaining = event.capacity - event.bookedTickets;
  const availabilityPercentage = (remaining / event.capacity) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Event Details Card */}
        <Card className="mb-8 border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <CardTitle className="text-4xl leading-tight font-extrabold text-slate-900 dark:text-white">
                {event.name}
              </CardTitle>
              {availabilityPercentage < 30 && (
                <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-semibold">Low Stock!</span>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20">
                  <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Event Date and Time
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {format(new Date(event.date), "MMM do, yyyy hh:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
                  <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Venue
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {event.venue}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 dark:bg-pink-500/20">
                  <Users className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Available
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {remaining} / {event.capacity}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              {event.description}
            </p>
          </CardContent>
        </Card>

        {/* Dynamic Pricing Card */}
        <Card className="mb-8 overflow-hidden border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute top-0 right-0 h-64 w-64 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl dark:from-indigo-500/5 dark:via-purple-500/5 dark:to-pink-500/5" />

          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              Dynamic Pricing Breakdown
            </CardTitle>
          </CardHeader>

          <CardContent className="relative">
            <div className="space-y-6">
              {/* Base Price */}
              <div className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Base Price
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  ${event.basePrice.toFixed(2)}
                </span>
              </div>

              {/* Adjustments */}
              <div className="space-y-3">
                {event.pricingRules.timeBased.adjustmentRate > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-500/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 dark:bg-orange-500/20">
                        <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Time-based adjustment
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Weight: {event.pricingRules.timeBased.weight}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      +
                      {(
                        event.pricingRules.timeBased.adjustmentRate * 100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}

                {event.pricingRules.demandBased.adjustmentRate > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/30 dark:bg-purple-500/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
                        <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Demand-based adjustment
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Weight: {event.pricingRules.demandBased.weight}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      +
                      {(
                        event.pricingRules.demandBased.adjustmentRate * 100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}

                {event.pricingRules.inventoryBased.adjustmentRate > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-500/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 dark:bg-red-500/20">
                        <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Inventory-based adjustment
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Weight: {event.pricingRules.inventoryBased.weight}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      +
                      {(
                        event.pricingRules.inventoryBased.adjustmentRate * 100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
              </div>

              {/* Price Range */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Price Range
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${event.floorPrice.toFixed(2)} - $
                    {event.ceilingPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Current Price */}
              <div className="flex items-center justify-between rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-lg dark:border-indigo-800 dark:from-indigo-950 dark:to-purple-950">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  Current Price
                </span>
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-extrabold text-transparent dark:from-indigo-400 dark:to-purple-400">
                  ${event.currentPrice.toFixed(2)}
                </span>
              </div>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                Price updates every 30 seconds based on demand
              </div>
            </div>
          </CardContent>
        </Card>

        <BookingForm event={event} />
      </div>
    </div>
  );
}
