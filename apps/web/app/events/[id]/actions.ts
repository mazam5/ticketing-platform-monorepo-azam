"use server";

export async function handleBooking({
  eventId,
  email,
  quantity,
}: {
  eventId: string;
  email: string;
  quantity: number;
}) {
  try {
    const res = await fetch("http://localhost:3001/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        customerEmail: email,
        ticketCount: quantity,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { success: false, message: errorData.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, message: "Server error during booking" };
  }
}
