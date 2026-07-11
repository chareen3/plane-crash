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
  ADD COLUMN IF NOT EXISTS weighted_risk_score INTEGER;

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
  DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.crash_rounds;
  CREATE POLICY "Allow anonymous inserts via API key" ON public.crash_rounds
    FOR INSERT TO anon
    WITH CHECK (current_setting('request.headers', true)::json->>'x-extension-api-key' IS NOT NULL);

  -- predictions
  DROP POLICY IF EXISTS "Allow service insert" ON public.predictions;
  CREATE POLICY "Allow service insert via API key" ON public.predictions
    FOR INSERT TO anon
    WITH CHECK (current_setting('request.headers', true)::json->>'x-extension-api-key' IS NOT NULL);

  -- Handle optional tables if they exist
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'round_summaries') THEN
    DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.round_summaries;
    CREATE POLICY "Allow anonymous inserts via API key" ON public.round_summaries
      FOR INSERT TO anon WITH CHECK (current_setting('request.headers', true)::json->>'x-extension-api-key' IS NOT NULL);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_config') THEN
    DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.game_config;
    CREATE POLICY "Allow anonymous inserts via API key" ON public.game_config
      FOR INSERT TO anon WITH CHECK (current_setting('request.headers', true)::json->>'x-extension-api-key' IS NOT NULL);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'strategy_eval') THEN
    DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.strategy_eval;
    CREATE POLICY "Allow anonymous inserts via API key" ON public.strategy_eval
      FOR INSERT TO anon WITH CHECK (current_setting('request.headers', true)::json->>'x-extension-api-key' IS NOT NULL);
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
