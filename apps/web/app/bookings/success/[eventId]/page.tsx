"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Download,
  Mail,
  MapPin,
  Sparkles,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Booking } from "utils/types";

const BookingSuccessPage = () => {
  const { eventId } = useParams();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (eventId) {
      fetchBooking();
    }
  }, []);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/bookings?eventId=${eventId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch booking details");
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error("No booking found for this event");
      }

      const recentlyBooked = data[0];
      setBooking(recentlyBooked);
      sessionStorage.setItem("myEmail", recentlyBooked.customerEmail);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load booking details",
      );
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceDifference = () => {
    if (!booking) return { amount: 0, percentage: 0, status: "same" };
    return { amount: 0, percentage: 0, status: "same" };
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400"></div>
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Loading booking details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
        <Card className="max-w-md border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                <span className="text-4xl">❌</span>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
                Booking Not Found
              </h2>
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                {error || "Unable to find booking details"}
              </p>
              <Link href="/events">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500">
                  Browse Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceDiff = calculatePriceDifference();
  const totalSavings = priceDiff.amount * booking.ticketCount;
  const pricePerTicket = (booking.totalAmount / booking.ticketCount).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Success Header */}
        <div className="relative mb-12 text-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full bg-green-500/20 blur-3xl dark:bg-green-500/10" />
          </div>

          <div className="relative">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl shadow-green-500/30 dark:from-green-500 dark:to-emerald-500">
              <CheckCircle className="h-14 w-14 animate-pulse text-white" />
            </div>
            <h1 className="mb-3 text-4xl font-extrabold text-slate-900 dark:text-white">
              Booking Confirmed!
            </h1>
            <p className="mb-2 text-lg text-slate-600 dark:text-slate-300">
              Your tickets have been successfully booked
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Booking ID:{" "}
                <span className="font-mono font-bold">{booking.id}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Event Details Card */}
          <Card className="border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">
                {booking.eventName}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20">
                  <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Event Date
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {format(booking.eventDate, "MMM dd, yyyy hh:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
                  <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Venue
                  </p>
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {booking.eventVenue}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-500/10 dark:bg-pink-500/20">
                  <Ticket className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Tickets
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {booking.ticketCount}{" "}
                    {booking.ticketCount === 1 ? "Ticket" : "Tickets"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                  <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Email
                  </p>
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {booking.customerEmail}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary Card */}
          <Card className="border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">
                  Price per Ticket
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  ${pricePerTicket}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <span className="text-slate-700 dark:text-slate-300">
                  Number of Tickets
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {booking.ticketCount}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-lg dark:border-indigo-800 dark:from-indigo-950 dark:to-purple-950">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  Total Paid
                </span>
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-extrabold text-transparent dark:from-indigo-400 dark:to-purple-400">
                  ${booking.totalAmount.toFixed(2)}
                </span>
              </div>

              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Booking made on{" "}
                {format(booking.createdAt, "MMM dd, yyyy hh:mm a")}
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-14 w-full border-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-5 w-5" />
              Download Tickets
            </Button>
            <Link href="/events" className="w-full">
              <Button className="h-14 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600">
                Browse More Events
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
