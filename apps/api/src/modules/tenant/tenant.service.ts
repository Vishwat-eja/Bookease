import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

export class TenantService {
  static async getPublicTenantBySlug(slug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        timezone: true,
        currency: true,
        cancelPolicyHours: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            price: true,
            depositAmount: true,
            bufferMinutes: true,
          },
        },
        staff: {
          where: { isActive: true },
          select: {
            id: true,
            bio: true,
            avatarUrl: true,
            user: {
              select: { firstName: true, lastName: true },
            },
            staffServices: {
              select: { serviceId: true },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new AppError('Business not found', 404);
    }

    return tenant;
  }

  static async getTenantById(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) throw new AppError('Tenant not found', 404);
    return tenant;
  }

  static async updateTenant(
    id: string,
    data: {
      name?: string;
      logoUrl?: string;
      timezone?: string;
      currency?: string;
      cancelPolicyHours?: number;
    }
  ) {
    return prisma.tenant.update({
      where: { id },
      data,
    });
  }
}
