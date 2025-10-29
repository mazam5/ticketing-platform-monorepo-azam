"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowLeft, Badge, Ticket } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Booking } from "utils/types";

const page = () => {
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const fetchBookings = async () => {
    try {
      const email = sessionStorage.getItem("myEmail");
      const data = await fetch(
        `${apiUrl}/api/bookings/customer?email=${email}`,
      );

      const res = await data.json();

      const bookings: Booking[] = await res;
      setMyBookings(bookings);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const findATicketPrice = (totalAmount: number, ticketCount: number) => {
    return (totalAmount / ticketCount).toFixed(2);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-white">
            My Bookings
          </h1>
          <p className="text-slate-600">
            View and manage your ticket purchases
          </p>
        </div>

        <div className="space-y-4">
          {myBookings.length === 0 ? (
            <Card className={`border-slate-200 bg-white dark:bg-slate-900`}>
              <CardContent className="py-12 text-center">
                <Ticket className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  No bookings yet
                </h3>
                <p className="text-slate-600">
                  Start exploring events and book your tickets!
                </p>
              </CardContent>
            </Card>
          ) : (
            myBookings.map((booking: Booking) => {
              const priceDiff = booking.currentPrice - booking.totalAmount;
              return (
                <Card
                  key={booking.id}
                  className={`border-slate-200 bg-white transition-shadow hover:shadow-md dark:bg-slate-900`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div className="flex-1">
                        <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                          {booking.eventName}
                        </h3>
                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                          <p>Booking ID: {booking.id}</p>
                          <p>Tickets: {booking.ticketCount}</p>
                          <p>
                            Per Ticket: $
                            {findATicketPrice(
                              booking.totalAmount,
                              booking.ticketCount,
                            )}
                          </p>
                          <p>
                            Booked:{" "}
                            {format(new Date(booking.createdAt), "PPpp")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all md:items-end dark:border-slate-800 dark:bg-slate-900">
                        <div className="space-y-3 text-right">
                          {/* Price Paid */}
                          <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Price Paid
                            </p>
                            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                              ${booking.totalAmount}
                            </p>
                          </div>

                          <div className="h-px bg-slate-200 dark:bg-slate-800" />

                          <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Current Price
                            </p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                              ${booking.currentPrice} × {booking.ticketCount}
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                              = $
                              {(
                                booking.currentPrice * booking.ticketCount
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default page;
