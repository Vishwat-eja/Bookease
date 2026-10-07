'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import {
  DollarSign,
  Calendar,
  Users,
  Percent,
  Clock,
  ExternalLink,
  Plus,
  LogOut,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'bookings' | 'services' | 'staff'>('analytics');

  // Data states
  const [analytics, setAnalytics] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Service Modal state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState(60);
  const [newServicePrice, setNewServicePrice] = useState(75);
  const [newServiceDeposit, setNewServiceDeposit] = useState(25);

  useEffect(() => {
    const token = localStorage.getItem('bookease_token');
    const storedUser = localStorage.getItem('bookease_user');
    const storedTenant = localStorage.getItem('bookease_tenant');

    if (!token || !storedUser || !storedTenant) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(storedUser));
    setTenant(JSON.parse(storedTenant));

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    const [analyticsRes, bookingsRes, servicesRes, staffRes] = await Promise.all([
      fetchApi('/analytics/overview'),
      fetchApi('/bookings'),
      fetchApi('/services'),
      fetchApi('/staff'),
    ]);

    if (analyticsRes.success) setAnalytics(analyticsRes.data);
    if (bookingsRes.success) setBookings(bookingsRes.data);
    if (servicesRes.success) setServices(servicesRes.data);
    if (staffRes.success) setStaffList(staffRes.data);

    setLoading(false);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchApi('/services', {
      method: 'POST',
      body: JSON.stringify({
        name: newServiceName,
        durationMinutes: Number(newServiceDuration),
        price: Number(newServicePrice),
        depositAmount: Number(newServiceDeposit),
      }),
    });

    if (res.success) {
      setShowServiceModal(false);
      setNewServiceName('');
      loadDashboardData();
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    const res = await fetchApi(`/bookings/${bookingId}/cancel`, { method: 'POST' });
    if (res.success) {
      loadDashboardData();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dashboard Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center">B</div>
            <div>
              <span className="font-bold text-slate-900">{tenant?.name}</span>
              <span className="text-xs text-slate-400 block">Owner Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={`/b/${tenant?.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200"
            >
              Public Booking Page <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-600 hover:text-rose-600 flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-8 space-x-6">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Analytics Overview
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'bookings'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'services'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Services Catalog ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'staff'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Staff Team ({staffList.length})
          </button>
        </div>

        {/* TAB 1: ANALYTICS OVERVIEW */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>TOTAL REVENUE</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">${analytics.metrics.totalRevenue}</div>
                <div className="text-xs text-slate-400 mt-1">Paid deposit volume</div>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>TOTAL BOOKINGS</span>
                  <Calendar className="w-4 h-4 text-sky-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{analytics.metrics.totalBookings}</div>
                <div className="text-xs text-slate-400 mt-1">{analytics.metrics.confirmedBookings} Confirmed</div>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>NO-SHOW RATE</span>
                  <Percent className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{analytics.metrics.noShowRate}%</div>
                <div className="text-xs text-slate-400 mt-1">{analytics.metrics.noShowCount} Total no-shows</div>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>REPEAT CUSTOMER RATE</span>
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{analytics.metrics.repeatCustomerRate}%</div>
                <div className="text-xs text-slate-400 mt-1">Loyal client retention</div>
              </div>
            </div>

            {/* Top Services Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 text-base mb-4">Top Performing Services</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-xs">
                      <th className="pb-3 font-semibold">SERVICE</th>
                      <th className="pb-3 font-semibold">PRICE</th>
                      <th className="pb-3 font-semibold">BOOKINGS</th>
                      <th className="pb-3 font-semibold">EST. REVENUE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.topServices.map((service: any) => (
                      <tr key={service.id} className="text-slate-800">
                        <td className="py-3.5 font-medium text-slate-900">{service.name}</td>
                        <td className="py-3.5">${service.price}</td>
                        <td className="py-3.5">{service.bookingCount}</td>
                        <td className="py-3.5 font-bold text-emerald-600">${service.estimatedRevenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS LIST */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Appointments & Bookings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
                    <th className="py-3 px-6 font-semibold">CUSTOMER</th>
                    <th className="py-3 px-6 font-semibold">SERVICE</th>
                    <th className="py-3 px-6 font-semibold">STAFF</th>
                    <th className="py-3 px-6 font-semibold">DATE & TIME</th>
                    <th className="py-3 px-6 font-semibold">STATUS</th>
                    <th className="py-3 px-6 font-semibold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b: any) => (
                    <tr key={b.id} className="text-slate-800 hover:bg-slate-50">
                      <td className="py-4 px-6 font-medium">
                        <div className="font-semibold text-slate-900">{b.customer?.name}</div>
                        <div className="text-xs text-slate-400">{b.customer?.email}</div>
                      </td>
                      <td className="py-4 px-6">{b.service?.name}</td>
                      <td className="py-4 px-6">
                        {b.staff?.user?.firstName} {b.staff?.user?.lastName}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600">
                        {new Date(b.startTime).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {b.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES CATALOG */}
        {activeTab === 'services' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Services Catalog</h3>
              <button
                onClick={() => setShowServiceModal(true)}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow"
              >
                <Plus className="w-4 h-4" /> Add New Service
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((svc: any) => (
                <div key={svc.id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 text-base">{svc.name}</h4>
                    <span className="font-bold text-sky-600">${svc.price}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{svc.description || 'No description provided.'}</p>
                  <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
                    <div>Duration: {svc.durationMinutes} mins (Buffer: {svc.bufferMinutes}m)</div>
                    <div>Required Deposit: ${svc.depositAmount}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal for Creating Service */}
            {showServiceModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full border shadow-lg">
                  <h3 className="font-bold text-slate-900 text-lg mb-4">Create New Service</h3>
                  <form onSubmit={handleCreateService} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name</label>
                      <input
                        type="text"
                        required
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (min)</label>
                        <input
                          type="number"
                          required
                          value={newServiceDuration}
                          onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Price ($)</label>
                        <input
                          type="number"
                          required
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit ($)</label>
                        <input
                          type="number"
                          required
                          value={newServiceDeposit}
                          onChange={(e) => setNewServiceDeposit(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowServiceModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow"
                      >
                        Save Service
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STAFF TEAM */}
        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {staffList.map((st: any) => (
              <div key={st.id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 font-bold text-slate-700 flex items-center justify-center shrink-0">
                  {st.user.firstName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    {st.user.firstName} {st.user.lastName}{' '}
                    <span className="text-xs font-normal text-slate-400">({st.user.role})</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">{st.user.email}</p>
                  <p className="text-xs text-slate-600 mt-2">{st.bio || 'Professional team member'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
