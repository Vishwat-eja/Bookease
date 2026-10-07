import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

export class InvoiceService {
  static async generateInvoice(dbOrTx: any, tenantId: string, bookingId: string) {
    const existing = await dbOrTx.invoice.findUnique({ where: { bookingId } });
    if (existing) return existing;

    const booking = await dbOrTx.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true, service: true, staff: { include: { user: true } }, customer: true },
    });

    if (!booking) throw new AppError('Booking not found', 404);

    const shortId = bookingId.replace(/-/g, '').slice(0, 6).toUpperCase();
    let invoiceNumber = `INV-${new Date().getFullYear()}-${shortId}`;

    const existingNum = await dbOrTx.invoice.findUnique({ where: { invoiceNumber } });
    if (existingNum) {
      invoiceNumber = `INV-${new Date().getFullYear()}-${shortId}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const uploadsDir = path.join(__dirname, '../../../uploads/invoices');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const pdfPath = path.join(uploadsDir, `${invoiceNumber}.pdf`);

    // Create PDF Invoice using dynamic require
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Header & Business Branding
    doc.fontSize(22).fillColor('#1e293b').text(booking.tenant.name.toUpperCase(), { align: 'left' });
    doc.fontSize(10).fillColor('#64748b').text(`Invoice #: ${invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(1.5);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e2e8f0');
    doc.moveDown(1.5);

    // Customer & Service Details
    doc.fontSize(12).fillColor('#0f172a').text('Billed To:');
    doc.fontSize(10).fillColor('#334155').text(`Customer: ${booking.customer.name}`);
    doc.text(`Email: ${booking.customer.email}`);
    if (booking.customer.phone) doc.text(`Phone: ${booking.customer.phone}`);
    doc.moveDown(1.5);

    doc.fontSize(12).fillColor('#0f172a').text('Booking Details:');
    doc.fontSize(10).fillColor('#334155').text(`Service: ${booking.service.name}`);
    doc.text(`Staff: ${booking.staff.user.firstName} ${booking.staff.user.lastName}`);
    doc.text(`Date & Time: ${new Date(booking.startTime).toUTCString()}`);
    doc.moveDown(1.5);

    // Table Header
    doc.fontSize(11).fillColor('#0f172a').text('Description', 50, doc.y, { width: 300, continued: true });
    doc.text('Amount', { align: 'right' });
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor('#475569').text(`${booking.service.name} (Deposit)`, 50, doc.y, { width: 300, continued: true });
    doc.text(`${booking.tenant.currency} ${booking.depositAmount.toFixed(2)}`, { align: 'right' });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e2e8f0');
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#0f172a').text(`Total Paid: ${booking.tenant.currency} ${booking.depositAmount.toFixed(2)}`, { align: 'right' });

    doc.end();

    const invoice = await dbOrTx.invoice.create({
      data: {
        tenantId,
        bookingId,
        invoiceNumber,
        pdfPath,
      },
    });

    return invoice;
  }

  static async getInvoiceByBookingId(tenantId: string, bookingId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { bookingId, tenantId },
    });
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
  }
}
