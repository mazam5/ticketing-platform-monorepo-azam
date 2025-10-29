"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { handleBooking } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Event } from "utils/types";

export function BookingForm({ event }: { event: Event }) {
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [currentPrice, setCurrentPrice] = useState(event.currentPrice);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const remaining = event.capacity - event.bookedTickets;
  const totalPrice = quantity * currentPrice;

  // 🔄 Auto-refresh current price every 30 seconds
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          `http://localhost:3001/api/events/${event.id}`,
          {
            cache: "no-store",
          },
        );
        if (res.ok) {
          const data = await res.json();
          setCurrentPrice(data.data.currentPrice);
          setLastUpdated(new Date());
        }
      } catch {
        console.warn("Failed to refresh price");
      }
    };

    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [event.id]);

  async function onSubmit() {
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (quantity < 1 || quantity > remaining) {
      setError(`Please select between 1 and ${remaining} tickets`);
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await handleBooking({
        eventId: event.id,
        email,
        quantity,
      });

      if (result.success) {
        toast.success("Booking successful!");
        window.location.href = `/bookings/success/${event.id}`;
      } else {
        toast.error(result.message || "Booking failed");
      }
    });
  }

  return (
    <Card className="mb-8 border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="space-y-4">
        <CardTitle className="text-3xl leading-tight font-extrabold text-slate-900 dark:text-white">
          Book Your Tickets
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col justify-between lg:flex-row">
          <div className="pb-5 lg:w-1/2 lg:pr-4">
            <Label className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">
              Email Address
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={remaining === 0 || !event.isActive}
            />
          </div>

          <div>
            <Label className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">
              Number of Tickets (Max 10 per order)
            </Label>
            <Select
              value={quantity.toString()}
              onValueChange={(value) => setQuantity(Number(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a quantity" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Quantity</SelectLabel>
                  {[...Array(remaining)].slice(0, 10).map((_, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <p className="mt-1 text-xs text-slate-500 dark:text-white">
              {remaining} tickets available
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="dark: dark: rounded-lg border border-slate-200 bg-slate-100 p-4 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-white">
              Total Price:
            </span>
            <span className="text-2xl font-bold text-green-600">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-white">
            {quantity} × ${currentPrice.toFixed(2)} • Updated{" "}
            {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <Button
          className="w-full py-6 text-lg font-semibold"
          onClick={onSubmit}
          disabled={isPending || remaining === 0 || !event.isActive}
        >
          {isPending ? "Processing..." : "Complete Booking"}
        </Button>
      </CardContent>
    </Card>
  );
}
