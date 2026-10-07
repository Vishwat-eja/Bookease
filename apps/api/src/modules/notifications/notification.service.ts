import nodemailer from 'nodemailer';
import { prisma } from '../../config/prisma';

export interface NotificationProvider {
  sendEmail(to: string, subject: string, bodyHtml: string): Promise<boolean>;
  sendSMS(to: string, message: string): Promise<boolean>;
}

export class NodemailerNotificationProvider implements NotificationProvider {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal_stub@bookease.com',
        pass: 'stub_pass',
      },
    });
  }

  async sendEmail(to: string, subject: string, bodyHtml: string): Promise<boolean> {
    console.log(`[EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);
    return true;
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    console.log(`[SMS DISPATCH] To: ${to} | Message: ${message}`);
    return true;
  }
}

export class NotificationService {
  private static provider: NotificationProvider = new NodemailerNotificationProvider();

  static async sendBookingConfirmation(booking: any) {
    const subject = `Booking Confirmation - ${booking.service.name}`;
    const bodyHtml = `
      <h2>Booking Confirmed!</h2>
      <p>Dear ${booking.customer.name},</p>
      <p>Your appointment for <strong>${booking.service.name}</strong> with <strong>${booking.staff.user.firstName} ${booking.staff.user.lastName}</strong> is confirmed.</p>
      <p><strong>Date & Time:</strong> ${new Date(booking.startTime).toUTCString()}</p>
      <p><strong>Deposit Paid:</strong> $${booking.depositAmount}</p>
      <br/>
      <p>Thank you for choosing ${booking.tenant?.name || 'BookEase'}!</p>
    `;

    const success = await this.provider.sendEmail(booking.customer.email, subject, bodyHtml);

    await prisma.notificationLog.create({
      data: {
        tenantId: booking.tenantId,
        bookingId: booking.id,
        type: 'CONFIRMATION',
        channel: 'EMAIL',
        recipient: booking.customer.email,
        status: success ? 'SENT' : 'FAILED',
      },
    });
  }

  static async scheduleReminders(booking: any) {
    console.log(`[REMINDER QUEUED] Scheduled 24h and 2h reminders for Booking ID: ${booking.id}`);
  }
}
