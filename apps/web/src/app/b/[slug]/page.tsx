'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { Calendar, Clock, User, Check, CreditCard, Download, AlertCircle, ArrowLeft } from 'lucide-react';

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Flow Steps
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Form Selections
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // Customer Information
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Processing & Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);

  useEffect(() => {
    const loadTenant = async () => {
      setLoading(true);
      const res = await fetchApi(`/public/b/${slug}`);
      if (res.success) {
        setTenant(res.data);
      } else {
        setError(res.error?.message || 'Business not found');
      }
      setLoading(false);
    };
    loadTenant();
  }, [slug]);

  // Fetch slots whenever service, staff, or date changes
  useEffect(() => {
    if (selectedService && selectedDate) {
      const loadSlots = async () => {
        setSlotsLoading(true);
        const endpoint = `/public/b/${slug}/availability?serviceId=${selectedService.id}&date=${selectedDate}&staffId=${selectedStaffId}`;
        const res = await fetchApi(endpoint);
        if (res.success) {
          setAvailableSlots(res.data);
        } else {
          setAvailableSlots([]);
        }
        setSlotsLoading(false);
      };
      loadSlots();
    }
  }, [selectedService, selectedStaffId, selectedDate, slug]);

  const handleCreateBooking = async () => {
    if (!selectedSlot || !customerEmail || !customerName) return;

    setSubmitting(true);
    setError(null);

    const res = await fetchApi(`/public/b/${slug}/book`, {
      method: 'POST',
      body: JSON.stringify({
        serviceId: selectedService.id,
        staffId: selectedSlot.staffId,
        startTime: selectedSlot.startTime,
        customerName,
        customerEmail,
        customerPhone,
        notes,
      }),
    });

    if (!res.success) {
      setError(res.error?.message || 'Failed to create booking');
      setSubmitting(false);
      return;
    }

    const bookingData = res.data;

    // Simulate deposit payment confirmation
    const payRes = await fetchApi('/payments/confirm-simulated', {
      method: 'POST',
      body: JSON.stringify({ bookingId: bookingData.id }),
    });

    if (payRes.success) {
      setBookingConfirmation(payRes.data);
      setStep(6);
    } else {
      setError(payRes.error?.message || 'Payment processing failed');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Business Not Found</h2>
          <p className="text-slate-600 mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Business Header Branding */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} className="w-16 h-16 rounded-xl object-cover border" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-sky-600 text-white font-bold text-2xl flex items-center justify-center">
              {tenant.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Online Booking Page • Currency: {tenant.currency} • Timezone: {tenant.timezone}
            </p>
          </div>
        </div>

        {/* Booking Card Flow */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Progress Header */}
          <div className="bg-slate-100/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>STEP {step} OF 6</span>
            {step > 1 && step < 6 && (
              <button
                onClick={() => setStep((step - 1) as any)}
                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
          </div>

          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Select Service */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Select a Service</h2>
                <p className="text-slate-500 text-sm mb-6">Choose the treatment or service you would like to book.</p>

                <div className="space-y-4">
                  {tenant.services.map((service: any) => (
                    <div
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep(2);
                      }}
                      className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        selectedService?.id === service.id
                          ? 'border-sky-600 bg-sky-50/50 ring-1 ring-sky-600'
                          : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{service.name}</h3>
                        {service.description && (
                          <p className="text-xs text-slate-500 mt-1">{service.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> {service.durationMinutes} min
                          </span>
                          <span>Deposit: ${service.depositAmount}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-lg">${service.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Select Staff */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Select Professional</h2>
                <p className="text-slate-500 text-sm mb-6">Choose a staff member or pick any available practitioner.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      setSelectedStaffId('any');
                      setStep(3);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      selectedStaffId === 'any' ? 'border-sky-600 bg-sky-50/50 ring-1 ring-sky-600' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-sm">
                      *
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Any Available Staff</h4>
                      <p className="text-xs text-slate-500">First available specialist</p>
                    </div>
                  </div>

                  {tenant.staff.map((st: any) => (
                    <div
                      key={st.id}
                      onClick={() => {
                        setSelectedStaffId(st.id);
                        setStep(3);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                        selectedStaffId === st.id ? 'border-sky-600 bg-sky-50/50 ring-1 ring-sky-600' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                        {st.user.firstName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {st.user.firstName} {st.user.lastName}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-1">{st.bio || 'Staff Member'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Pick Date & Time Slot */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Select Date & Time</h2>
                <p className="text-slate-500 text-sm mb-6">Choose an open time slot for your appointment.</p>

                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                  />
                </div>

                <label className="block text-xs font-semibold text-slate-700 mb-2">Available Slots</label>

                {slotsLoading ? (
                  <div className="py-8 text-center text-slate-500 text-sm">Computing available slots...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-sm">
                    No open slots available on this date. Please select another day.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableSlots.map((slot, idx) => {
                      const timeStr = new Date(slot.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      const isAvailable = slot.isAvailable !== false;

                      return (
                        <button
                          key={idx}
                          disabled={!isAvailable}
                          onClick={() => isAvailable && setSelectedSlot(slot)}
                          className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                            !isAvailable
                              ? 'bg-rose-50 border-rose-200 text-rose-600 opacity-80 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-sky-400 text-slate-800'
                          }`}
                        >
                          <span>{timeStr}</span>
                          {!isAvailable && (
                            <span className="text-[10px] uppercase font-bold tracking-wider no-underline text-rose-500">
                              Unavailable
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  <button
                    disabled={!selectedSlot}
                    onClick={() => setStep(4)}
                    className="bg-sky-600 disabled:opacity-50 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
                  >
                    Continue to Details
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Enter Customer Details */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Your Contact Information</h2>
                <p className="text-slate-500 text-sm mb-6">Enter your details to receive appointment reminders & receipt.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Jane Davis"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (SMS Reminders)</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Preferences</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Any special requests or details..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    disabled={!customerName || !customerEmail}
                    onClick={() => setStep(5)}
                    className="bg-sky-600 disabled:opacity-50 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Payment Summary & Checkout */}
            {step === 5 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Review & Pay Deposit</h2>
                <p className="text-slate-500 text-sm mb-6">Confirm your booking details and pay the required deposit.</p>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service:</span>
                    <span className="font-semibold text-slate-900">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Professional:</span>
                    <span className="font-semibold text-slate-900">{selectedSlot?.staffName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(selectedSlot?.startTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-500">Total Price:</span>
                    <span>${selectedService?.price}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-slate-900">
                    <span>Required Deposit Due Now:</span>
                    <span className="text-sky-600">${selectedService?.depositAmount}</span>
                  </div>
                </div>

                <button
                  disabled={submitting}
                  onClick={handleCreateBooking}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all shadow flex items-center justify-center gap-2 text-base"
                >
                  <CreditCard className="w-5 h-5" />
                  {submitting ? 'Processing Deposit Payment...' : `Pay $${selectedService?.depositAmount} Deposit & Confirm`}
                </button>
              </div>
            )}

            {/* STEP 6: Confirmation & Receipt */}
            {step === 6 && bookingConfirmation && (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Booking Confirmed!</h2>
                <p className="text-slate-600 text-sm mt-2">
                  A confirmation email and PDF invoice have been sent to <strong>{customerEmail}</strong>.
                </p>

                <div className="mt-6 p-5 bg-slate-50 rounded-2xl border text-left text-sm space-y-2 text-slate-700 max-w-md mx-auto">
                  <div><strong>Booking Ref:</strong> {bookingConfirmation.id}</div>
                  <div><strong>Service:</strong> {bookingConfirmation.service?.name}</div>
                  <div><strong>Staff:</strong> {bookingConfirmation.staff?.user?.firstName} {bookingConfirmation.staff?.user?.lastName}</div>
                  <div><strong>Time:</strong> {new Date(bookingConfirmation.startTime).toLocaleString()}</div>
                  <div><strong>Deposit Paid:</strong> ${bookingConfirmation.depositAmount}</div>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                  <a
                    href={`http://localhost:4000/api/invoices/booking/${bookingConfirmation.id}/download`}
                    target="_blank"
                    className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow"
                  >
                    <Download className="w-4 h-4" /> Download PDF Invoice
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
