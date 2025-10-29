import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Flame } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const EventsPage = async () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const data = await fetch(`${apiUrl}/api/events`);
  const res = await data.json();
  const events: Event[] = await res.data;
  const getAvailabilityColor = (remaining: any, capacity: any) => {
    const percentage = (remaining / capacity) * 100;
    if (percentage > 50) return "text-green-600 dark:text-green-400";
    if (percentage > 20) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-extrabold text-slate-900 dark:text-white">
            Upcoming Events
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Discover and book tickets for amazing events with dynamic pricing
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event: any) => {
            const remaining = event.capacity - event.bookedTickets;
            const soldPercentage = (
              (event.bookedTickets / event.capacity) *
              100
            ).toFixed(0);

            return (
              <Card
                key={event.id}
                className="group relative overflow-hidden border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-indigo-500/30"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5 dark:group-hover:opacity-10" />

                <CardHeader className="relative">
                  <div className="mb-3 flex items-start justify-between">
                    <CardTitle className="flex-1 text-xl leading-tight font-bold text-slate-900 dark:text-white">
                      {event.name}
                    </CardTitle>
                    {Number(soldPercentage) > 80 && (
                      <Badge className="ml-2 border-0 bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30">
                        <Flame className="mr-1 h-3 w-3" />
                        Hot!
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    {format(new Date(event.date), "EEEE, MMMM do yyyy h:mm a")}
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      {event.venue}
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">
                          ${event.currentPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${getAvailabilityColor(remaining, event.capacity)}`}
                        >
                          {remaining} left
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {soldPercentage}% sold
                        </div>
                      </div>
                    </div>

                    <Link href={`/events/${event.id}`} className="block">
                      <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:shadow-indigo-500/20 dark:hover:from-indigo-600 dark:hover:to-purple-600">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
