import { ModeToggle } from "components/theme/mode-toggle";
import { ThemeProvider } from "components/theme/theme-provider";
import { Calendar, Ticket, User } from "lucide-react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "EventTix",
  description: "AI-powered dynamic event ticketing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
        {/* ✅ Shared Navbar */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <nav className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-black/30">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                {/* Logo */}
                <Link href="/" className="group flex items-center space-x-2">
                  <div className="relative">
                    <Ticket className="h-8 w-8 text-indigo-600 transition-all group-hover:rotate-12 group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300" />
                    <div className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-purple-500 dark:bg-purple-400" />
                  </div>
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent dark:from-indigo-400 dark:to-purple-400">
                    EventTix
                  </span>
                </Link>

                {/* Nav Links */}
                <div className="flex items-center space-x-1">
                  <Link
                    href="/events"
                    className="flex items-center space-x-2 rounded-xl px-4 py-2 text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <Calendar className="h-5 w-5" />
                    <span className="font-medium">Events</span>
                  </Link>
                  <Link
                    href="/my-bookings"
                    className="flex items-center space-x-2 rounded-xl px-4 py-2 text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">My Bookings</span>
                  </Link>

                  <ModeToggle />
                </div>
              </div>
            </div>
          </nav>

          {/* ✅ Page content goes here */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
