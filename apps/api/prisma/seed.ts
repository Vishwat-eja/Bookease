import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.auditLog.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.timeOff.deleteMany({});
  await prisma.workingHours.deleteMany({});
  await prisma.staffService.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  // 1. Create Demo Business Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Glow & Style Salon',
      slug: 'glow-style',
      timezone: 'America/New_York',
      currency: 'USD',
      cancelPolicyHours: 24,
      logoUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80',
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Create Owner User
  const ownerUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'owner@glowstyle.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: 'OWNER',
    },
  });

  const ownerStaff = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      userId: ownerUser.id,
      bio: 'Owner & Master Stylist with 12+ years experience in precision cuts and bridal styling.',
      isActive: true,
    },
  });

  // 3. Create Staff User
  const staffUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'alex@glowstyle.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Rivera',
      role: 'STAFF',
    },
  });

  const alexStaff = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      userId: staffUser.id,
      bio: 'Senior Hair Colorist specializing in balayage, highlights, and custom vivid tones.',
      isActive: true,
    },
  });

  // 4. Create Working Hours (Mon-Fri 09:00 - 18:00, Sat 10:00-16:00, Sun Off)
  const staffList = [ownerStaff, alexStaff];
  for (const staff of staffList) {
    const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      staffId: staff.id,
      dayOfWeek: day,
      startTime: day === 6 ? '10:00' : '09:00',
      endTime: day === 6 ? '16:00' : '18:00',
      isOff: day === 0, // Sunday Off
    }));
    await prisma.workingHours.createMany({ data: hours });
  }

  // 5. Create Services
  const haircutService = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: 'Haircut & Precision Styling',
      description: 'Consultation, scalp massage, signature haircut, and blowout.',
      durationMinutes: 60,
      price: 85.0,
      depositAmount: 30.0,
      bufferMinutes: 15,
      isActive: true,
    },
  });

  const colorService = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: 'Balayage & Custom Color',
      description: 'Hand-painted balayage or full highlights with gloss toner treatment.',
      durationMinutes: 120,
      price: 195.0,
      depositAmount: 65.0,
      bufferMinutes: 30,
      isActive: true,
    },
  });

  const facialService = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: 'Hydrating Glow Facial',
      description: 'Deep cleansing, gentle exfoliation, hydrating mask, and facial acupressure massage.',
      durationMinutes: 75,
      price: 120.0,
      depositAmount: 40.0,
      bufferMinutes: 15,
      isActive: true,
    },
  });

  // Assign Services to Staff
  await prisma.staffService.createMany({
    data: [
      { staffId: ownerStaff.id, serviceId: haircutService.id },
      { staffId: ownerStaff.id, serviceId: colorService.id },
      { staffId: ownerStaff.id, serviceId: facialService.id },
      { staffId: alexStaff.id, serviceId: colorService.id },
      { staffId: alexStaff.id, serviceId: haircutService.id },
    ],
  });

  // 6. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Emily Davis',
      email: 'emily.davis@example.com',
      phone: '+1 (555) 234-5678',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Michael Scott',
      email: 'michael.scott@example.com',
      phone: '+1 (555) 876-5432',
    },
  });

  // 7. Create Sample Bookings & Payments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(10, 0, 0, 0);

  const endTomorrow = new Date(tomorrow.getTime() + 75 * 60000);

  const booking1 = await prisma.booking.create({
    data: {
      tenantId: tenant.id,
      serviceId: haircutService.id,
      staffId: ownerStaff.id,
      customerId: customer1.id,
      startTime: tomorrow,
      endTime: endTomorrow,
      status: 'CONFIRMED',
      notes: 'First time visitor, requested layered cut.',
      totalAmount: haircutService.price,
      depositAmount: haircutService.depositAmount,
    },
  });

  await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      bookingId: booking1.id,
      provider: 'STRIPE',
      providerTxId: 'pi_demo_glow_001',
      amount: haircutService.depositAmount,
      currency: 'USD',
      status: 'PAID',
    },
  });

  await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      bookingId: booking1.id,
      invoiceNumber: 'INV-2026-0001',
    },
  });

  console.log('✅ Database seed completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Tenant Slug: glow-style');
  console.log('Owner Credentials -> Email: owner@glowstyle.com | Password: password123');
  console.log('Staff Credentials -> Email: alex@glowstyle.com  | Password: password123');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
