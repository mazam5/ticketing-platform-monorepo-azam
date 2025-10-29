import Link from "next/link";
import {
  Ticket,
  Calendar,
  User,
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-react";
import { ModeToggle } from "components/theme/mode-toggle";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Floating badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/60 px-4 py-2 backdrop-blur-sm dark:border-indigo-800 dark:bg-white/5">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              AI-Powered Dynamic Pricing
            </span>
          </div>

          <h1 className="mb-6 text-5xl leading-tight font-extrabold text-slate-900 md:text-7xl dark:text-white">
            Experience the Future of
            <span className="animate-gradient mt-2 block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              Event Ticketing
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-gray-300">
            Smart pricing that evolves with demand. Book early, save more. Every
            second counts in the dynamic marketplace.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/events"
              className="group relative transform rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/40 dark:from-indigo-500 dark:to-purple-500 dark:shadow-indigo-500/20 dark:hover:shadow-indigo-500/30"
            >
              <span className="flex items-center gap-2">
                Browse Events
                <Zap className="h-5 w-5 group-hover:animate-pulse" />
              </span>
            </Link>
            <Link
              href="/my-bookings"
              className="group rounded-xl border-2 border-slate-300 bg-white/60 px-8 py-4 font-semibold text-slate-700 backdrop-blur-sm transition-all hover:border-indigo-400 hover:bg-white dark:border-slate-700 dark:bg-white/5 dark:text-white dark:hover:border-indigo-600 dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                View My Bookings
                <User className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>

          {/* Features */}
          <div className="mt-24 grid gap-6 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-8 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-indigo-500/20">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl transition-all group-hover:scale-150 dark:bg-indigo-500/20" />

              <div className="relative">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 dark:from-indigo-400 dark:to-indigo-500">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
                  Time-Based Pricing
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-gray-400">
                  Prices adjust as the event date approaches. Early birds get
                  the best deals—don't wait!
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-8 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-purple-500/20">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl transition-all group-hover:scale-150 dark:bg-purple-500/20" />

              <div className="relative">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30 dark:from-purple-400 dark:to-pink-500">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
                  Demand-Based Pricing
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-gray-400">
                  High booking velocity increases prices. Act fast when demand
                  is low to maximize savings.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-8 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-xl hover:shadow-pink-500/10 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-pink-500/20">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-pink-500/10 blur-2xl transition-all group-hover:scale-150 dark:bg-pink-500/20" />

              <div className="relative">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-red-600 shadow-lg shadow-pink-500/30 dark:from-pink-400 dark:to-red-500">
                  <Ticket className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
                  Inventory-Based Pricing
                </h3>
                <p className="leading-relaxed text-slate-600 dark:text-gray-400">
                  Prices rise as tickets sell out. Limited availability means
                  premium pricing—secure yours now.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
