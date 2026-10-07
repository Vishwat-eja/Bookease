import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';
import { InvoiceService } from '../invoices/invoice.service';
import { NotificationService } from '../notifications/notification.service';

export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>): Promise<{ clientSecret: string; providerTxId: string }>;
  refundPayment(providerTxId: string, amount: number): Promise<{ success: boolean; refundId: string }>;
}

export class StripePaymentProvider implements PaymentProvider {
  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>) {
    // Simulated Stripe Payment Intent for test/stub mode or actual Stripe SDK
    const providerTxId = `pi_stub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const clientSecret = `${providerTxId}_secret_stub`;
    return { clientSecret, providerTxId };
  }

  async refundPayment(providerTxId: string, amount: number) {
    return { success: true, refundId: `re_stub_${Date.now()}` };
  }
}

export class PaymentService {
  private static provider: PaymentProvider = new StripePaymentProvider();

  static async initiateDepositPayment(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true, service: true, customer: true, payment: true },
    });

    if (!booking) throw new AppError('Booking not found', 404);
    if (!booking.payment) throw new AppError('Payment record missing', 400);

    const intent = await this.provider.createPaymentIntent(
      booking.depositAmount,
      booking.tenant.currency,
      { bookingId: booking.id, tenantId: booking.tenantId }
    );

    await prisma.payment.update({
      where: { id: booking.payment.id },
      data: { providerTxId: intent.providerTxId },
    });

    return {
      bookingId: booking.id,
      amount: booking.depositAmount,
      currency: booking.tenant.currency,
      clientSecret: intent.clientSecret,
      providerTxId: intent.providerTxId,
    };
  }

  static async confirmPayment(bookingId: string, providerTxId?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true, service: true, staff: { include: { user: true } }, customer: true, payment: true },
    });

    if (!booking || !booking.payment) throw new AppError('Booking or payment missing', 404);

    const updatedBooking = await prisma.$transaction(
      async (tx) => {
        await tx.payment.update({
          where: { id: booking.payment!.id },
          data: {
            status: 'PAID',
            providerTxId: providerTxId || booking.payment!.providerTxId || `tx_${Date.now()}`,
          },
        });

        return tx.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' },
          include: { service: true, staff: { include: { user: true } }, customer: true, payment: true },
        });
      },
      { timeout: 15000, maxWait: 5000 }
    );

    // Auto-generate PDF Invoice post-transaction
    try {
      await InvoiceService.generateInvoice(prisma, updatedBooking.tenantId, updatedBooking.id);
    } catch (err) {
      console.error('[Invoice Generation Error]', err);
    }

    // Schedule Automated Reminders & send confirmation post-transaction
    try {
      await NotificationService.sendBookingConfirmation(updatedBooking);
      await NotificationService.scheduleReminders(updatedBooking);
    } catch (err) {
      console.error('[Notification Error]', err);
    }

    return updatedBooking;
  }

  static async handleWebhookEvent(event: { type: string; data: any }) {
    if (event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.completed') {
      const bookingId = event.data?.object?.metadata?.bookingId;
      const providerTxId = event.data?.object?.id;
      if (bookingId) {
        await this.confirmPayment(bookingId, providerTxId);
      }
    }
    return { received: true };
  }
}
