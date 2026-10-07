import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StaffService } from './staff.service';
import { authenticateJwt, requireRoles } from '../../middleware/auth';

const router = Router();

const createStaffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['STAFF', 'OWNER']).optional(),
  bio: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
});

const workingHoursSchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM'),
    isOff: z.boolean(),
  })
);

const timeOffSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
});

router.use(authenticateJwt);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await StaffService.getStaffList(req.user!.tenantId);
    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await StaffService.getStaffById(req.user!.tenantId, req.params.id);
    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRoles('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createStaffSchema.parse(req.body);
    const staff = await StaffService.createStaff(req.user!.tenantId, validated);
    res.status(201).json({ success: true, data: staff });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
    }
    next(err);
  }
});

router.put('/:id/hours', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Owners can edit any staff; staff can edit their own hours
    if (req.user!.role !== 'OWNER' && req.user!.staffId !== req.params.id) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }
    const validated = workingHoursSchema.parse(req.body);
    const staff = await StaffService.updateWorkingHours(req.user!.tenantId, req.params.id, validated);
    res.status(200).json({ success: true, data: staff });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
    }
    next(err);
  }
});

router.post('/:id/timeoff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'OWNER' && req.user!.staffId !== req.params.id) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }
    const validated = timeOffSchema.parse(req.body);
    const timeOff = await StaffService.addTimeOff(req.user!.tenantId, req.params.id, validated);
    res.status(201).json({ success: true, data: timeOff });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
    }
    next(err);
  }
});

router.delete('/:id/timeoff/:timeOffId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'OWNER' && req.user!.staffId !== req.params.id) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }
    await StaffService.deleteTimeOff(req.user!.tenantId, req.params.id, req.params.timeOffId);
    res.status(200).json({ success: true, message: 'Time off deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
