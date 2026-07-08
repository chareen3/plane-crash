-- migration.sql
-- Run this in the Supabase SQL Editor to create the crash_rounds table

CREATE TABLE IF NOT EXISTS public.crash_rounds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number bigint NOT NULL,
  crash_point numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (since extension might send data without user login, or API key will be used)
CREATE POLICY "Allow anonymous inserts" ON public.crash_rounds
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public read access for the dashboard
CREATE POLICY "Allow public read" ON public.crash_rounds
  FOR SELECT
  TO anon
  USING (true);

-- Also enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_rounds;

-- Predictions Table
CREATE TABLE IF NOT EXISTS public.predictions (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number          bigint NOT NULL UNIQUE,
  predicted_risk        text,
  confidence            int,
  summary               text,
  predicted_multiplier  numeric,
  long_targets          jsonb,
  should_bet            boolean,
  skip_reason           text,
  cashout_target        numeric,
  strategy              text,
  strategy_reason       text,
  ai_model_used         text,
  swing_target          numeric,
  volatility_phase      text,
  recommended_stake_pct int,
  created_at            timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service insert" ON public.predictions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public read" ON public.predictions
  FOR SELECT TO anon USING (true);

-- Index for fast round_number lookup (used in cache check)
CREATE INDEX idx_predictions_round_number ON public.predictions (round_number);

-- Add hour/day tracking columns (Sri Lanka and UTC) & duration columns
ALTER TABLE public.crash_rounds 
ADD COLUMN IF NOT EXISTS hour_utc SMALLINT GENERATED ALWAYS AS (EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))) STORED,
ADD COLUMN IF NOT EXISTS hour_sl SMALLINT GENERATED ALWAYS AS (EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Asia/Colombo'))) STORED,
ADD COLUMN IF NOT EXISTS day_of_week SMALLINT GENERATED ALWAYS AS (EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Colombo'))) STORED,
ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'extension';

