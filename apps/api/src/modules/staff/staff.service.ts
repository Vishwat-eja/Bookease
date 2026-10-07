import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

export class StaffService {
  static async getStaffList(tenantId: string) {
    return prisma.staff.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        staffServices: { include: { service: true } },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        timeOff: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getStaffById(tenantId: string, id: string) {
    const staff = await prisma.staff.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        staffServices: { include: { service: true } },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        timeOff: true,
      },
    });
    if (!staff) throw new AppError('Staff member not found', 404);
    return staff;
  }

  static async createStaff(
    tenantId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role?: 'STAFF' | 'OWNER';
      bio?: string;
      serviceIds?: string[];
    }
  ) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new AppError('A user with this email already exists', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId,
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role || 'STAFF',
          },
        });

        const staff = await tx.staff.create({
          data: {
            tenantId,
            userId: user.id,
            bio: data.bio,
            isActive: true,
          },
        });

        // Default Working Hours (Mon-Fri 09:00 - 17:00, Sat & Sun Off)
        const workingHoursData = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          staffId: staff.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          isOff: day === 0 || day === 6,
        }));

        await tx.workingHours.createMany({ data: workingHoursData });

        if (data.serviceIds && data.serviceIds.length > 0) {
          await tx.staffService.createMany({
            data: data.serviceIds.map((serviceId) => ({
              staffId: staff.id,
              serviceId,
            })),
          });
        }

        return staff;
      },
      { timeout: 15000, maxWait: 5000 }
    );

    return this.getStaffById(tenantId, result.id);
  }

  static async updateWorkingHours(
    tenantId: string,
    staffId: string,
    hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isOff: boolean }>
  ) {
    await this.getStaffById(tenantId, staffId);

    await prisma.$transaction(
      hours.map((h) =>
        prisma.workingHours.upsert({
          where: {
            staffId_dayOfWeek: { staffId, dayOfWeek: h.dayOfWeek },
          },
          update: {
            startTime: h.startTime,
            endTime: h.endTime,
            isOff: h.isOff,
          },
          create: {
            staffId,
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime,
            endTime: h.endTime,
            isOff: h.isOff,
          },
        })
      )
    );

    return this.getStaffById(tenantId, staffId);
  }

  static async addTimeOff(
    tenantId: string,
    staffId: string,
    data: { startDate: string; endDate: string; reason?: string }
  ) {
    await this.getStaffById(tenantId, staffId);

    return prisma.timeOff.create({
      data: {
        staffId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
      },
    });
  }

  static async deleteTimeOff(tenantId: string, staffId: string, timeOffId: string) {
    await this.getStaffById(tenantId, staffId);
    return prisma.timeOff.delete({
      where: { id: timeOffId },
    });
  }
}
