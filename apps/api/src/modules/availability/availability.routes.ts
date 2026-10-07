import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AvailabilityService } from './availability.service';

const router = Router();

const querySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  staffId: z.string().optional(),
});

router.get('/public/b/:slug/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = querySchema.parse(req.query);
    const slots = await AvailabilityService.getAvailableSlots({
      tenantSlug: req.params.slug,
      serviceId: validated.serviceId,
      date: validated.date,
      staffId: validated.staffId,
    });
    res.status(200).json({ success: true, data: slots });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
    }
    next(err);
  }
});

export default router;
