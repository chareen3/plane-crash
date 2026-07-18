-- 01_saas_schema.sql
-- Run this in the Supabase SQL Editor or apply via API/CLI to create the SaaS schema

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  timezone text,
  is_admin boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  polar_customer_id text,
  polar_subscription_id text,
  status text NOT NULL DEFAULT 'none' CHECK (status IN ('active', 'canceled', 'past_due', 'trial', 'none')),
  current_period_end timestamptz,
  payment_method text NOT NULL DEFAULT 'none' CHECK (payment_method IN ('polar_card', 'bank_transfer', 'none')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL,
  method text NOT NULL CHECK (method IN ('polar_card', 'bank_transfer')),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
  external_ref text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add unique constraint on external_ref if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_external_ref'
  ) THEN
    ALTER TABLE public.payments ADD CONSTRAINT unique_external_ref UNIQUE (external_ref);
  END IF;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Definer Helpers for RLS to prevent recursion

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active', 'trial')
      AND current_period_end > now()
  ) OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Establish Row Level Security Policies

-- Profiles Policies
DROP POLICY IF EXISTS "Allow users to view own profile" ON public.profiles;
CREATE POLICY "Allow users to view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Subscriptions Policies
DROP POLICY IF EXISTS "Allow users to view own subscription" ON public.subscriptions;
CREATE POLICY "Allow users to view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Only admins or system service role can modify subscription rows directly
DROP POLICY IF EXISTS "Allow admins to update subscriptions" ON public.subscriptions;
CREATE POLICY "Allow admins to update subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_admin());

-- Payments Policies
DROP POLICY IF EXISTS "Allow users to view own payments" ON public.payments;
CREATE POLICY "Allow users to view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Allow users to insert own payments" ON public.payments;
CREATE POLICY "Allow users to insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admins to update payments" ON public.payments;
CREATE POLICY "Allow admins to update payments" ON public.payments
  FOR UPDATE USING (public.is_admin());

-- Re-gating crash_rounds and predictions tables to require active subscription or admin access
DROP POLICY IF EXISTS "Allow public read" ON public.crash_rounds;
CREATE POLICY "Allow read for active subscribers" ON public.crash_rounds
  FOR SELECT TO authenticated
  USING (public.has_active_subscription());

DROP POLICY IF EXISTS "Allow public read" ON public.predictions;
CREATE POLICY "Allow read for active subscribers" ON public.predictions
  FOR SELECT TO authenticated
  USING (public.has_active_subscription());

-- 6. User Auth Registration Trigger Function

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, timezone, is_admin)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'timezone',
    COALESCE((new.raw_user_meta_data->>'is_admin')::boolean, false)
  );

  -- Insert default starting subscription
  INSERT INTO public.subscriptions (user_id, status, payment_method, current_period_end)
  VALUES (
    new.id,
    'trial',
    'none',
    now() + interval '30 days'
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users insertion
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
