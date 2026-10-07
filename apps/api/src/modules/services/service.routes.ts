import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ServiceCatalogService } from './service.service';
import { authenticateJwt, requireRoles } from '../../middleware/auth';

const router = Router();

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().min(0),
  depositAmount: z.number().min(0),
  bufferMinutes: z.number().int().min(0).optional(),
  staffIds: z.array(z.string()).optional(),
});

const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

router.use(authenticateJwt);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = await ServiceCatalogService.getServices(req.user!.tenantId);
    res.status(200).json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await ServiceCatalogService.getServiceById(req.user!.tenantId, req.params.id);
    res.status(200).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRoles('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createServiceSchema.parse(req.body);
    const service = await ServiceCatalogService.createService(req.user!.tenantId, validated);
    res.status(201).json({ success: true, data: service });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
    }
    next(err);
  }
});

router.patch('/:id', requireRoles('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateServiceSchema.parse(req.body);
    const service = await ServiceCatalogService.updateService(req.user!.tenantId, req.params.id, validated);
    res.status(200).json({ success: true, data: service });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
    }
    next(err);
  }
});

router.delete('/:id', requireRoles('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ServiceCatalogService.deleteService(req.user!.tenantId, req.params.id);
    res.status(200).json({ success: true, message: 'Service deactivated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
