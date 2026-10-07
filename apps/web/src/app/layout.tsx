import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BookEase - Modern Service Business Booking & Billing Platform',
  description: 'Branded online booking, deposit payments, staff scheduling, and automated appointment reminders for salons, clinics, tutors, and service businesses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
