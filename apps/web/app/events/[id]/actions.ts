"use server";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function handleBooking({
  eventId,
  email,
  quantity,
  amountPaid,
}: {
  eventId: string;
  email: string;
  quantity: number;
  amountPaid: number;
}) {
  try {
    const res = await fetch(`${apiUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        customerEmail: email,
        ticketCount: quantity,
        amountPaid,
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
