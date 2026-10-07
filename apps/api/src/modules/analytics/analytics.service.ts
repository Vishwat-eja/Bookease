import { prisma } from '../../config/prisma';

export class AnalyticsService {
  static async getOverviewMetrics(tenantId: string) {
    const totalBookingsCount = await prisma.booking.count({ where: { tenantId } });
    const confirmedCount = await prisma.booking.count({ where: { tenantId, status: 'CONFIRMED' } });
    const completedCount = await prisma.booking.count({ where: { tenantId, status: 'COMPLETED' } });
    const cancelledCount = await prisma.booking.count({ where: { tenantId, status: 'CANCELLED' } });
    const noShowCount = await prisma.booking.count({ where: { tenantId, status: 'NO_SHOW' } });

    const totalRevenueResult = await prisma.payment.aggregate({
      where: { tenantId, status: 'PAID' },
      _sum: { amount: true },
    });

    const totalRevenue = totalRevenueResult._sum.amount || 0;
    const noShowRate = totalBookingsCount > 0 ? (noShowCount / totalBookingsCount) * 100 : 0;

    // Top services calculation
    const services = await prisma.service.findMany({
      where: { tenantId },
      include: {
        _count: { select: { bookings: true } },
      },
      orderBy: { bookings: { _count: 'desc' } },
      take: 5,
    });

    const topServices = services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      bookingCount: s._count.bookings,
      estimatedRevenue: s.price * s._count.bookings,
    }));

    // Repeat customer rate calculation
    const customerBookings = await prisma.booking.groupBy({
      by: ['customerId'],
      where: { tenantId },
      _count: { id: true },
    });

    const totalUniqueCustomers = customerBookings.length;
    const repeatCustomersCount = customerBookings.filter((c) => c._count.id > 1).length;
    const repeatCustomerRate = totalUniqueCustomers > 0 ? (repeatCustomersCount / totalUniqueCustomers) * 100 : 0;

    return {
      metrics: {
        totalRevenue,
        totalBookings: totalBookingsCount,
        confirmedBookings: confirmedCount,
        completedBookings: completedCount,
        cancelledBookings: cancelledCount,
        noShowCount,
        noShowRate: Number(noShowRate.toFixed(1)),
        repeatCustomerRate: Number(repeatCustomerRate.toFixed(1)),
      },
      topServices,
    };
  }
}
