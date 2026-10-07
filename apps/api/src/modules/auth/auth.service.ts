import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import { AuthUser } from '../../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_access_key_bookease_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_bookease_2026';

export class AuthService {
  static generateTokens(payload: AuthUser) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: payload.userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  static async registerOwner(data: {
    businessName: string;
    slug: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    timezone?: string;
    currency?: string;
  }) {
    const existingTenant = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existingTenant) {
      throw new AppError('A business with this slug already exists', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.businessName,
          slug: data.slug,
          timezone: data.timezone || 'UTC',
          currency: data.currency || 'USD',
          cancelPolicyHours: 24,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'OWNER',
        },
      });

      const staff = await tx.staff.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          bio: 'Business Owner & Service Provider',
          isActive: true,
        },
      });

      // Default Working Hours (Monday=1 to Friday=5: 09:00 - 17:00, Sat=6 & Sun=0: Off)
      const workingHoursData = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        staffId: staff.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isOff: day === 0 || day === 6,
      }));

      await tx.workingHours.createMany({
        data: workingHoursData,
      });

      return { tenant, user, staff };
    }, { timeout: 15000, maxWait: 5000 });

    const tokenPayload: AuthUser = {
      userId: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: 'OWNER',
      staffId: result.staff.id,
    };

    const tokens = this.generateTokens(tokenPayload);

    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        staffId: result.staff.id,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        currency: result.tenant.currency,
        timezone: result.tenant.timezone,
      },
      tokens,
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        tenant: true,
        staffProfile: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokenPayload: AuthUser = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role as any,
      staffId: user.staffProfile?.id,
    };

    const tokens = this.generateTokens(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        staffId: user.staffProfile?.id,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        currency: user.tenant.currency,
        timezone: user.tenant.timezone,
      },
      tokens,
    };
  }

  static async refresh(refreshTokenStr: string) {
    try {
      const payload = jwt.verify(refreshTokenStr, JWT_REFRESH_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { staffProfile: true },
      });

      if (!user || user.refreshToken !== refreshTokenStr) {
        throw new AppError('Invalid refresh token', 401);
      }

      const tokenPayload: AuthUser = {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role as any,
        staffId: user.staffProfile?.id,
      };

      const tokens = this.generateTokens(tokenPayload);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        tenant: true,
        staffProfile: {
          select: { id: true, bio: true, avatarUrl: true },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }
}
