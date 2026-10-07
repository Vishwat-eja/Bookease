import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

export class BookingService {
  static async createBooking(data: {
    tenantSlug: string;
    serviceId: string;
    staffId: string;
    startTime: string; // ISO string
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    notes?: string;
    idempotencyKey?: string;
    userId?: string;
  }) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug },
    });
    if (!tenant) throw new AppError('Business not found', 404);

    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, tenantId: tenant.id, isActive: true },
    });
    if (!service) throw new AppError('Service not found', 404);

    const start = new Date(data.startTime);
    const durationMinutes = service.durationMinutes + service.bufferMinutes;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    // Double-Booking Concurrency Lock Transaction
    return prisma.$transaction(
      async (tx) => {
      // Check for idempotency key if provided
      if (data.idempotencyKey) {
        const existingKey = await tx.booking.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
          include: { service: true, staff: { include: { user: true } }, payment: true },
        });
        if (existingKey) return existingKey;
      }

      // Concurrency check inside transaction: verify staff availability
      const overlappingBookings = await tx.booking.findMany({
        where: {
          staffId: data.staffId,
          status: { in: ['PENDING_PAYMENT', 'CONFIRMED'] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });

      if (overlappingBookings.length > 0) {
        throw new AppError(
          'This slot was just booked by another customer. Please select a different time.',
          409
        );
      }

      // Upsert Customer record
      const customer = await tx.customer.upsert({
        where: {
          tenantId_email: { tenantId: tenant.id, email: data.customerEmail },
        },
        update: {
          name: data.customerName,
          phone: data.customerPhone || undefined,
        },
        create: {
          tenantId: tenant.id,
          email: data.customerEmail,
          name: data.customerName,
          phone: data.customerPhone,
        },
      });

      // Create Booking
      const booking = await tx.booking.create({
        data: {
          tenantId: tenant.id,
          serviceId: service.id,
          staffId: data.staffId,
          customerId: customer.id,
          userId: data.userId || null,
          startTime: start,
          endTime: end,
          status: 'PENDING_PAYMENT',
          notes: data.notes,
          totalAmount: service.price,
          depositAmount: service.depositAmount,
          idempotencyKey: data.idempotencyKey || null,
        },
        include: {
          service: true,
          staff: { include: { user: true } },
          customer: true,
        },
      });

      // Create Pending Payment record
      const payment = await tx.payment.create({
        data: {
          tenantId: tenant.id,
          bookingId: booking.id,
          provider: 'STRIPE',
          amount: service.depositAmount,
          currency: tenant.currency,
          status: 'PENDING',
        },
      });

      return {
        ...booking,
        payment,
      };
    }, { timeout: 15000, maxWait: 5000 });
  }

  static async getBookings(
    tenantId: string,
    filters?: { staffId?: string; status?: string; startDate?: string; endDate?: string }
  ) {
    const where: any = { tenantId };
    if (filters?.staffId) where.staffId = filters.staffId;
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.startTime = {};
      if (filters?.startDate) where.startTime.gte = new Date(filters.startDate);
      if (filters?.endDate) where.startTime.lte = new Date(filters.endDate);
    }

    return prisma.booking.findMany({
      where,
      include: {
        service: true,
        staff: { include: { user: { select: { firstName: true, lastName: true } } } },
        customer: true,
        payment: true,
        invoice: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }

  static async getBookingById(tenantId: string, bookingId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: {
        service: true,
        staff: { include: { user: { select: { firstName: true, lastName: true } } } },
        customer: true,
        payment: true,
        invoice: true,
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    return booking;
  }

  static async cancelBooking(tenantId: string, bookingId: string, cancelledByUserId?: string) {
    const booking = await this.getBookingById(tenantId, bookingId);
    if (booking.status === 'CANCELLED') {
      throw new AppError('Booking is already cancelled', 400);
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const hoursNotice = (new Date(booking.startTime).getTime() - Date.now()) / (1000 * 60 * 60);

    const eligibleForRefund = hoursNotice >= (tenant?.cancelPolicyHours || 24);

    return prisma.$transaction(
      async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      if (booking.payment && booking.payment.status === 'PAID') {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: eligibleForRefund ? 'REFUNDED' : 'PAID' },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: cancelledByUserId || 'CUSTOMER',
          action: 'BOOKING_CANCELLED',
          details: JSON.stringify({ bookingId, eligibleForRefund, hoursNotice }),
        },
      });

      return { booking: updatedBooking, eligibleForRefund };
    },
    { timeout: 15000, maxWait: 5000 }
    );
  }
}
