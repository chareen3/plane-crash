# Crash Tracker SaaS Dashboard

A production-ready SaaS web application built with **Next.js (App Router, TypeScript, Tailwind)**, **Supabase (Postgres + Auth)**, and **Polar.sh** for subscription billing. It supports credit card billing ($8 USD/month) and manual bank transfers for Sri Lankan Rupees (2,700 LKR).

## System Architecture & Features
- **User Authentication**: Handled via Supabase Auth (Email/Password registration and login).
- **Subscription Gating**: Middleware and Layout Server Component guards protect all `/app/*` routes. Users must have an active subscription (or be an admin) to see predictions.
- **Polar.sh Billing**: Integrates credit card checkouts and secure webhook signature verification.
- **Sri Lanka Bank Transfer**: Allows manual LKR transfers with a submission form and a security-gated Admin Panel (`/admin`) for confirming pending references.
- **Trigger Actions**: Automatically populates profiles and subscription states on sign-up in Supabase.

---

## 1. Supabase Database Migration

To set up the database tables, triggers, and Row Level Security (RLS) policies:

1. Log in to your **Supabase Dashboard**.
2. Go to the **SQL Editor** tab.
3. Open a new query.
4. Copy the entire contents of the migration file located at:
   [supabase/01_saas_schema.sql](../supabase/01_saas_schema.sql)
5. Run the SQL script to create the `profiles`, `subscriptions`, and `payments` tables, establish the auth triggers, and set up Row Level Security.

---

## 2. Polar.sh Billing Setup

1. Sign up on [Polar.sh](https://polar.sh) and create an organization.
2. In the developer section, configure a **Product**:
   - **Name**: Pro Plan
   - **Price**: 8.00 USD (Monthly subscription)
3. Note the **Product Price ID** (starts with `price_...`).
4. Generate an **Organization Access Token** in your developer settings.
5. Set up a **Webhook Endpoint** pointing to:
   `https://your-domain.com/api/polar/webhook` (or tunnel locally using `polar listen http://localhost:3000/` for local testing).
6. Note the **Webhook Signing Secret** (starts with `whsec_...`).

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env.local` inside the `dashboard` directory:

```bash
cp .env.example .env.local
```

Fill in the appropriate configuration variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase API URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anonymous key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (Required to update subscription states securely).
- `POLAR_ACCESS_TOKEN`: The Polar Organization Access Token.
- `POLAR_PRICE_ID`: The product price ID for your $8 monthly subscription plan.
- `POLAR_WEBHOOK_SECRET`: The Polar webhook signing secret to verify signatures.
- `POLAR_ENV`: Set to `sandbox` to test using mock accounts and fake test card numbers (`4242 4242 4242 4242`). Set to `production` in production.
- `NEXT_PUBLIC_POLAR_CUSTOMER_PORTAL_URL`: The URL to your hosted Polar portal (e.g. `https://polar.sh/my-org/portal`) so users can self-manage subscriptions.
- `NEXT_PUBLIC_APP_URL`: The base URL of the Next.js app.

---

## 4. Local Development

Install the project dependencies and launch the Next.js development server:

```bash
# Install NPM dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

---

## 5. Deployment on Vercel

When deploying to Vercel, ensure you configure all the environment variables from `.env.local` in your **Vercel Project Settings -> Environment Variables**.

Vercel will automatically build the standalone bundle and deploy it globally. Ensure the Supabase Auth Redirect URLs are updated to point to your new Vercel domain.
