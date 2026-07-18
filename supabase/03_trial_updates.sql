-- 03_trial_updates.sql
-- Run this in the Supabase SQL Editor to update your existing database has_active_subscription helper and handle_new_user trigger.

-- 1. Update has_active_subscription to support trial status
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

-- 2. Update handle_new_user function to insert a 30-day trial subscription by default
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
