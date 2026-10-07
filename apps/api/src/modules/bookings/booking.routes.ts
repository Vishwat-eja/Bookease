import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingService } from './booking.service';
import { authenticateJwt, optionalJwt, requireRoles } from '../../middleware/auth';

const router = Router();

const publicCreateBookingSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  startTime: z.string().datetime(),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

// Public booking creation endpoint /public/b/:slug/book
router.post('/public/b/:slug/book', optionalJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = publicCreateBookingSchema.parse(req.body);
    const booking = await BookingService.createBooking({
      tenantSlug: req.params.slug,
      serviceId: validated.serviceId,
      staffId: validated.staffId,
      startTime: validated.startTime,
      customerEmail: validated.customerEmail,
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      notes: validated.notes,
      idempotencyKey: validated.idempotencyKey,
      userId: req.user?.userId,
    });
    res.status(201).json({ success: true, data: booking });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
    }
    next(err);
  }
});

// Admin / Owner / Staff Bookings Dashboard Endpoints
router.get('/bookings', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { staffId, status, startDate, endDate } = req.query;
    // Staff can only view their own bookings unless Owner
    const filterStaffId = req.user!.role === 'STAFF' ? req.user!.staffId : (staffId as string);

    const bookings = await BookingService.getBookings(req.user!.tenantId, {
      staffId: filterStaffId,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

router.get('/bookings/:id', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await BookingService.getBookingById(req.user!.tenantId, req.params.id);
    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

router.post('/bookings/:id/cancel', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await BookingService.cancelBooking(req.user!.tenantId, req.params.id, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
