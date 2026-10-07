import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

export class ServiceCatalogService {
  static async getServices(tenantId: string) {
    return prisma.service.findMany({
      where: { tenantId },
      include: {
        staffServices: {
          include: {
            staff: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getServiceById(tenantId: string, id: string) {
    const service = await prisma.service.findFirst({
      where: { id, tenantId },
      include: {
        staffServices: {
          include: {
            staff: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });
    if (!service) throw new AppError('Service not found', 404);
    return service;
  }

  static async createService(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      durationMinutes: number;
      price: number;
      depositAmount: number;
      bufferMinutes?: number;
      staffIds?: string[];
    }
  ) {
    const service = await prisma.service.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        price: data.price,
        depositAmount: data.depositAmount,
        bufferMinutes: data.bufferMinutes || 0,
      },
    });

    if (data.staffIds && data.staffIds.length > 0) {
      await prisma.staffService.createMany({
        data: data.staffIds.map((staffId) => ({
          serviceId: service.id,
          staffId,
        })),
      });
    }

    return this.getServiceById(tenantId, service.id);
  }

  static async updateService(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      durationMinutes?: number;
      price?: number;
      depositAmount?: number;
      bufferMinutes?: number;
      isActive?: boolean;
      staffIds?: string[];
    }
  ) {
    await this.getServiceById(tenantId, id);

    const { staffIds, ...updateData } = data;

    await prisma.service.update({
      where: { id },
      data: updateData,
    });

    if (staffIds !== undefined) {
      await prisma.staffService.deleteMany({
        where: { serviceId: id },
      });

      if (staffIds.length > 0) {
        await prisma.staffService.createMany({
          data: staffIds.map((staffId) => ({
            serviceId: id,
            staffId,
          })),
        });
      }
    }

    return this.getServiceById(tenantId, id);
  }

  static async deleteService(tenantId: string, id: string) {
    await this.getServiceById(tenantId, id);
    return prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
