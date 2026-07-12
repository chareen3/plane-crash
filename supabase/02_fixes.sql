-- 02_fixes.sql
-- Fixes for schema gaps and security issues identified by Supabase Advisor

-- 1. Deduplicate and Add Missing Uniqueness Constraint to crash_rounds
-- Delete duplicates before adding constraint to avoid errors
DELETE FROM public.crash_rounds a USING (
    SELECT MIN(ctid) as ctid, source, round_number
    FROM public.crash_rounds
    GROUP BY source, round_number HAVING COUNT(*) > 1
) b WHERE a.source = b.source AND a.round_number = b.round_number AND a.ctid <> b.ctid;

ALTER TABLE public.crash_rounds 
  ADD CONSTRAINT unique_source_round UNIQUE (source, round_number);

-- 2. Schema Gaps vs. stats.ts New Fields
-- Add missing columns to predictions table
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS master_signal TEXT,
  ADD COLUMN IF NOT EXISTS signal_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS session_momentum TEXT,
  ADD COLUMN IF NOT EXISTS markov_next JSONB,
  ADD COLUMN IF NOT EXISTS markov_suggested_cashout NUMERIC,
  ADD COLUMN IF NOT EXISTS instant_cluster_risk INTEGER,
  ADD COLUMN IF NOT EXISTS weighted_risk_score INTEGER,
  ADD COLUMN IF NOT EXISTS stability_analysis JSONB;

-- 3. Security Issues (from Supabase Advisor)

-- A. Fix View Security (SECURITY DEFINER -> SECURITY INVOKER)
DROP VIEW IF EXISTS public.ai_context_window;
CREATE VIEW public.ai_context_window WITH (security_invoker = true) AS
SELECT 
  COUNT(*) as total_rounds,
  ROUND(AVG(crash_point),2) as avg_crash,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY crash_point)::numeric,2) as median_crash,
  COUNT(*) FILTER (WHERE crash_point >= 5) as above_5x_count,
  COUNT(*) FILTER (WHERE crash_point >= 10) as above_10x_count,
  MIN(created_at) as window_start,
  MAX(created_at) as window_end,
  EXTRACT(hour FROM MAX(created_at) AT TIME ZONE 'UTC') as current_hour_utc
FROM (SELECT crash_point, created_at FROM public.crash_rounds ORDER BY created_at DESC LIMIT 50) sub;

-- B. Fix Anon Inserts (Replace WITH CHECK (true) with API key check)
-- Assuming the extension will send an 'x-extension-api-key' header
-- If the tables round_summaries, game_config, strategy_eval don't exist, we skip them gracefully
DO $$ 
BEGIN
  -- crash_rounds
  DROP POLICY IF EXISTS "Allow anonymous inserts via API key" ON public.crash_rounds;
  DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.crash_rounds;
  CREATE POLICY "Allow anonymous inserts" ON public.crash_rounds
    FOR INSERT TO anon WITH CHECK (true);

  -- predictions
  DROP POLICY IF EXISTS "Allow service insert via API key" ON public.predictions;
  DROP POLICY IF EXISTS "Allow service insert" ON public.predictions;
  CREATE POLICY "Allow service insert" ON public.predictions
    FOR INSERT TO anon WITH CHECK (true);

  -- Handle optional tables if they exist
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'round_summaries') THEN
    DROP POLICY IF EXISTS "Allow anonymous inserts via API key" ON public.round_summaries;
    DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.round_summaries;
    CREATE POLICY "Allow anonymous inserts" ON public.round_summaries
      FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_config') THEN
    DROP POLICY IF EXISTS "Allow anonymous inserts via API key" ON public.game_config;
    DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.game_config;
    CREATE POLICY "Allow anonymous inserts" ON public.game_config
      FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'strategy_eval') THEN
    DROP POLICY IF EXISTS "Allow anonymous inserts via API key" ON public.strategy_eval;
    DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.strategy_eval;
    CREATE POLICY "Allow anonymous inserts" ON public.strategy_eval
      FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- C. Fix Function Security (Revoke anon and set search_path)
DO $$ 
BEGIN
  -- handle_new_user
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;

  -- has_active_subscription
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_active_subscription') THEN
    REVOKE EXECUTE ON FUNCTION public.has_active_subscription() FROM anon;
    ALTER FUNCTION public.has_active_subscription() SET search_path = public;
  END IF;

  -- is_admin
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
    ALTER FUNCTION public.is_admin() SET search_path = public;
  END IF;

  -- dynamic revokes and alters for the remaining functions
  DECLARE
    func_sig text;
  BEGIN
    FOR func_sig IN 
      SELECT oid::regprocedure::text 
      FROM pg_proc 
      WHERE proname IN ('upsert_user_activity', 'cleanup_crash_rounds', 'cleanup_predictions')
    LOOP
      EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || func_sig || ' FROM anon;';
      EXECUTE 'ALTER FUNCTION ' || func_sig || ' SET search_path = public;';
    END LOOP;
  END;
END $$;

-- 4. Scrape telemetry columns (player_count & total_bet_volume)
ALTER TABLE public.crash_rounds
  ADD COLUMN IF NOT EXISTS player_count integer,
  ADD COLUMN IF NOT EXISTS total_bet_volume numeric;

ALTER TABLE crash_rounds ADD COLUMN rounds_since_last_moon integer;

-- 5. Drop insecure anonymous insert policies (bypassed by service role in backend API)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON crash_rounds;
DROP POLICY IF EXISTS "Allow anon insert" ON predictions;
DROP POLICY IF EXISTS "Allow anon update" ON predictions;
DROP POLICY IF EXISTS "Allow service insert" ON predictions;
DROP POLICY IF EXISTS "Allow anonymous inserts on round_summaries" ON round_summaries;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON round_summaries;
DROP POLICY IF EXISTS "Allow anonymous insert game_config" ON game_config;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON game_config;
DROP POLICY IF EXISTS "Allow anonymous insert strategy_eval" ON strategy_eval;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON strategy_eval;

-- 6. Add secure SELECT policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated select predictions" ON predictions;
CREATE POLICY "Allow authenticated select predictions" ON predictions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated select crash_rounds" ON crash_rounds;
CREATE POLICY "Allow authenticated select crash_rounds" ON crash_rounds FOR SELECT TO authenticated USING (true);

-- 7. Add persistent game_settings table
CREATE TABLE IF NOT EXISTS public.game_settings (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Seed default values
INSERT INTO public.game_settings (key, value) VALUES
  ('maintenance_mode',   'false'),
  ('sleep_phase_enabled', 'true'),
  ('confidence_ceil',    '60'),
  ('max_cashout',        '3.00'),
  ('signal_mode',        '"normal"')
ON CONFLICT (key) DO NOTHING;

-- RLS: only service role or admin can write; anyone can read
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON public.game_settings;
CREATE POLICY "public read"  ON public.game_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin write" ON public.game_settings;
CREATE POLICY "admin write"  ON public.game_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
