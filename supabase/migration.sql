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
