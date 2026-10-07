import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TenantService } from './tenant.service';
import { authenticateJwt, requireRoles } from '../../middleware/auth';

const router = Router();

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  logoUrl: z.string().url().or(z.string().length(0)).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  cancelPolicyHours: z.number().min(0).max(168).optional(),
});

// Public endpoint for business profile landing page /b/[slug]
router.get('/public/b/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await TenantService.getPublicTenantBySlug(req.params.slug);
    res.status(200).json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
});

// Owner endpoint for tenant details
router.get('/tenant/me', authenticateJwt, requireRoles('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await TenantService.getTenantById(req.user!.tenantId);
    res.status(200).json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
});

// Owner endpoint to update business profile
router.patch('/tenant/me', authenticateJwt, requireRoles('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateTenantSchema.parse(req.body);
    const updated = await TenantService.updateTenant(req.user!.tenantId, validated);
    res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
    }
    next(err);
  }
});

export default router;
