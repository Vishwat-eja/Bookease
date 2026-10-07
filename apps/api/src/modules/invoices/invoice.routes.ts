import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { prisma } from '../../config/prisma';
import { InvoiceService } from './invoice.service';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/invoices/booking/:bookingId/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookingId = req.params.bookingId;
    const invoice = await prisma.invoice.findUnique({ where: { bookingId } });
    if (!invoice || !invoice.pdfPath || !fs.existsSync(invoice.pdfPath)) {
      return res.status(404).json({ success: false, error: { message: 'PDF invoice not found' } });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    fs.createReadStream(invoice.pdfPath).pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
