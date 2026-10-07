# BookEase - Deployment Guide

This guide describes how to deploy **BookEase** to production environments (Vercel for Frontend, Render/Railway for Backend API and PostgreSQL/Redis).

---

## 1. Database & Cache Infrastructure (Railway / Render / Managed Postgres)

1. **PostgreSQL**:
   - Provision a PostgreSQL database instance (v16+).
   - Set connection string in environment: `DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"`

2. **Redis**:
   - Provision a Redis cluster (v7+).
   - Set `REDIS_HOST` and `REDIS_PORT` (or `REDIS_URL`).

---

## 2. Deploying Backend API (`apps/api`)

1. **Platform**: Render, Railway, or AWS App Runner.
2. **Build Command**: `npm run build`
3. **Start Command**: `npx prisma db push && npm start`
4. **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=4000
   DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"
   JWT_SECRET="<generate_secure_random_64char_string>"
   JWT_REFRESH_SECRET="<generate_secure_random_64char_string>"
   REDIS_HOST="<your_redis_host>"
   REDIS_PORT=6379
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   CORS_ORIGIN="https://yourdomain.com"
   ```

---

## 3. Deploying Frontend App (`apps/web`)

1. **Platform**: Vercel or Netlify.
2. **Framework Preset**: Next.js
3. **Root Directory**: `apps/web`
4. **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api"
   NEXT_PUBLIC_APP_URL="https://yourdomain.com"
   ```

---

## 4. Stripe Webhook Registration

Add webhook endpoint URL in your Stripe Dashboard:
- **URL**: `https://api.yourdomain.com/api/payments/webhook`
- **Events**: `payment_intent.succeeded`, `checkout.session.completed`
- **Webhook Secret**: Copy to `STRIPE_WEBHOOK_SECRET` environment variable.
