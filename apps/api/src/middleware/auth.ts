import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  role: 'OWNER' | 'STAFF' | 'CUSTOMER';
  staffId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_access_key_bookease_2026';

export const authenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: Missing or malformed token', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch (err) {
    return next(new AppError('Unauthorized: Invalid or expired token', 401));
  }
};

export const requireRoles = (...roles: Array<'OWNER' | 'STAFF' | 'CUSTOMER'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' does not have permission to access this resource`,
          403
        )
      );
    }
    next();
  };
};

export const optionalJwt = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = payload;
      req.tenantId = payload.tenantId;
    } catch {
      // Ignore invalid token in optional mode
    }
  }
  next();
};
