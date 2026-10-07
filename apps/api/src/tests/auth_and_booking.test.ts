import request from 'supertest';
import app from '../index';
import { prisma } from '../config/prisma';

describe('BookEase API Integration Tests', () => {
  const testSlug = `test-salon-${Date.now()}`;
  let accessToken: string;
  let serviceId: string;
  let staffId: string;

  beforeAll(async () => {
    // Ensure database tables exist
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Should register a new owner and tenant business profile', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        businessName: 'Test Glam Salon',
        slug: testSlug,
        firstName: 'Jane',
        lastName: 'Doe',
        email: `jane.${Date.now()}@test.com`,
        password: 'password123',
        timezone: 'America/New_York',
        currency: 'USD',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tenant.slug).toBe(testSlug);
    expect(res.body.data.tokens.accessToken).toBeDefined();

    accessToken = res.body.data.tokens.accessToken;
    staffId = res.body.data.user.staffId;
  });

  it('2. Should create a new service as Owner', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Express Blowout',
        description: 'Quick hair styling service',
        durationMinutes: 30,
        price: 50,
        depositAmount: 15,
        bufferMinutes: 10,
        staffIds: [staffId],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Express Blowout');

    serviceId = res.body.data.id;
  });

  it('3. Should fetch public business profile by slug', async () => {
    const res = await request(app).get(`/api/public/b/${testSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test Glam Salon');
    expect(res.body.data.services.length).toBeGreaterThan(0);
  });

  it('4. Should calculate available slots for target date', async () => {
    // Pick next Monday date YYYY-MM-DD
    const targetDate = '2026-10-12';
    const res = await request(app).get(
      `/api/public/b/${testSlug}/availability?serviceId=${serviceId}&date=${targetDate}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('5. Should create a public booking and PREVENT double booking on the same slot', async () => {
    const startTime = '2026-10-12T10:00:00.000Z';

    // First booking attempt
    const res1 = await request(app)
      .post(`/api/public/b/${testSlug}/book`)
      .send({
        serviceId,
        staffId,
        startTime,
        customerName: 'Alice Smith',
        customerEmail: 'alice@example.com',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.status).toBe('PENDING_PAYMENT');

    // Second booking attempt on exact same time slot -> Double-Booking Guard Conflict
    const res2 = await request(app)
      .post(`/api/public/b/${testSlug}/book`)
      .send({
        serviceId,
        staffId,
        startTime,
        customerName: 'Bob Jones',
        customerEmail: 'bob@example.com',
      });

    expect(res2.status).toBe(409); // 409 Conflict
    expect(res2.body.success).toBe(false);
    expect(res2.body.error.message).toContain('slot was just booked');
  });
});
