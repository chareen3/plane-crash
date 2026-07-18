-- 04_remove_auto_trial.sql
-- Remove automatic trial insertion so users must explicitly claim the trial from the dashboard.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile only
  INSERT INTO public.profiles (id, email, timezone, is_admin)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'timezone',
    COALESCE((new.raw_user_meta_data->>'is_admin')::boolean, false)
  );

  -- Do NOT insert a default subscription.
  -- The user must click "Claim Trial" on the dashboard which will call the API.

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
