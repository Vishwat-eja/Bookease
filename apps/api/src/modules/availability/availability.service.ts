import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

export interface AvailableSlot {
  startTime: string; // ISO 8601 string in UTC
  endTime: string;   // ISO 8601 string in UTC
  staffId: string;
  staffName: string;
  isAvailable: boolean;
}

export class AvailabilityService {
  static async getAvailableSlots(params: {
    tenantSlug: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
    staffId?: string; // Specific staff ID or undefined for 'any'
  }): Promise<AvailableSlot[]> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
    });
    if (!tenant) throw new AppError('Business not found', 404);

    const service = await prisma.service.findFirst({
      where: { id: params.serviceId, tenantId: tenant.id, isActive: true },
    });
    if (!service) throw new AppError('Service not found or inactive', 404);

    const totalMinutes = service.durationMinutes + service.bufferMinutes;

    // Fetch qualifying staff
    let staffMembers = [];
    if (params.staffId && params.staffId !== 'any') {
      const singleStaff = await prisma.staff.findFirst({
        where: { id: params.staffId, tenantId: tenant.id, isActive: true },
        include: {
          user: { select: { firstName: true, lastName: true } },
          workingHours: true,
          timeOff: true,
        },
      });
      if (singleStaff) staffMembers.push(singleStaff);
    } else {
      staffMembers = await prisma.staff.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
          staffServices: { some: { serviceId: service.id } },
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          workingHours: true,
          timeOff: true,
        },
      });
    }

    if (staffMembers.length === 0) return [];

    const targetDate = new Date(params.date + 'T00:00:00.000Z');
    const dayOfWeek = targetDate.getUTCDay();

    // Map time string (ISO) -> AvailableSlot to consolidate slots across staff members
    const slotMap = new Map<string, AvailableSlot>();

    for (const staff of staffMembers) {
      const wh = staff.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
      if (!wh || wh.isOff) continue;

      const isTimeOff = staff.timeOff.some((to) => {
        return targetDate >= to.startDate && targetDate <= to.endDate;
      });
      if (isTimeOff) continue;

      const [startH, startM] = wh.startTime.split(':').map(Number);
      const [endH, endM] = wh.endTime.split(':').map(Number);

      const shiftStart = new Date(params.date + 'T00:00:00.000Z');
      shiftStart.setUTCHours(startH, startM, 0, 0);

      const shiftEnd = new Date(params.date + 'T00:00:00.000Z');
      shiftEnd.setUTCHours(endH, endM, 0, 0);

      const existingBookings = await prisma.booking.findMany({
        where: {
          staffId: staff.id,
          status: { in: ['PENDING_PAYMENT', 'CONFIRMED'] },
          startTime: { lt: shiftEnd },
          endTime: { gt: shiftStart },
        },
      });

      let cursor = new Date(shiftStart);
      while (cursor < shiftEnd) {
        const slotEnd = new Date(cursor.getTime() + totalMinutes * 60000);

        if (slotEnd <= shiftEnd) {
          const overlaps = existingBookings.some((booking) => {
            return booking.startTime < slotEnd && booking.endTime > cursor;
          });
          const isFree = !overlaps;
          const timeKey = cursor.toISOString();

          const existingSlot = slotMap.get(timeKey);
          if (!existingSlot) {
            slotMap.set(timeKey, {
              startTime: timeKey,
              endTime: slotEnd.toISOString(),
              staffId: staff.id,
              staffName: `${staff.user.firstName} ${staff.user.lastName}`,
              isAvailable: isFree,
            });
          } else if (!existingSlot.isAvailable && isFree) {
            // Upgrade slot if another staff member is free at this time
            slotMap.set(timeKey, {
              startTime: timeKey,
              endTime: slotEnd.toISOString(),
              staffId: staff.id,
              staffName: `${staff.user.firstName} ${staff.user.lastName}`,
              isAvailable: true,
            });
          }
        }

        cursor = new Date(cursor.getTime() + 30 * 60000);
      }
    }

    const availableSlots = Array.from(slotMap.values());
    return availableSlots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }
}
