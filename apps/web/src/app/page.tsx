import Link from 'next/link';
import { Calendar, Shield, Clock, CreditCard, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              B
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">BookEase</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/b/glow-style"
              className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors"
            >
              Demo Booking Page
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold mb-6">
          <Sparkles className="w-4 h-4" /> Multi-Tenant Booking & Billing Platform
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight">
          Effortless Online Bookings, Deposits & Automated Reminders
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl">
          Everything small service businesses need to thrive. Allow clients to book online 24/7, accept upfront deposit payments, eliminate no-shows with smart SMS/Email reminders, and issue instant PDF invoices.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all text-base"
          >
            Create Your Business Page <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/b/glow-style"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-medium px-6 py-3.5 rounded-xl transition-all text-base"
          >
            Try Public Booking Demo
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Smart Availability Engine</h3>
            <p className="mt-2 text-slate-600 text-sm">
              Computes open slots based on staff working hours, service durations, buffers, and existing bookings. Strictly prevents double-booking.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Upfront Deposits & Refunds</h3>
            <p className="mt-2 text-slate-600 text-sm">
              Accept credit card deposits directly through Stripe. Enforce configurable cancellation policy windows automatically.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Automated Reminders & Invoices</h3>
            <p className="mt-2 text-slate-600 text-sm">
              Send 24h & 2h appointment reminders via email/SMS powered by BullMQ. Auto-generate PDF invoices for paid appointments.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <p>© 2026 BookEase Inc. Built for salons, clinics, tutors, gyms & service providers.</p>
      </footer>
    </div>
  );
}
