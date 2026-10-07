import { Router, Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';

const router = Router();

router.post('/payments/initiate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, error: { message: 'bookingId required' } });
    const result = await PaymentService.initiateDepositPayment(bookingId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/payments/confirm-simulated', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, error: { message: 'bookingId required' } });
    const booking = await PaymentService.confirmPayment(bookingId);
    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

router.post('/payments/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;
    const result = await PaymentService.handleWebhookEvent(event);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
