-- ==============================================================================
-- SHOWUP SOCIAL DASHBOARD: DATABASE SCHEMA TEMPLATE
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Daily Aggregated Activity Table
CREATE TABLE IF NOT EXISTS public.activity_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('x', 'li')),
  posts INTEGER NOT NULL DEFAULT 0,
  replies INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_date_platform UNIQUE (date, platform)
);

CREATE INDEX IF NOT EXISTS idx_activity_daily_date ON public.activity_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_daily_platform ON public.activity_daily (platform);

-- 2. Granular Individual Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('x', 'li')),
  platform_post_id TEXT UNIQUE NOT NULL,
  content TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  replies INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON public.posts (platform);

-- 3. User Targets & Goals
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL UNIQUE CHECK (platform IN ('x', 'li')),
  daily_posts INTEGER NOT NULL DEFAULT 1,
  daily_replies INTEGER NOT NULL DEFAULT 8,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default initial targets
INSERT INTO public.user_goals (platform, daily_posts, daily_replies)
VALUES 
  ('x', 2, 8),
  ('li', 1, 4)
ON CONFLICT (platform) DO NOTHING;

-- 4. Enable Row Level Security (RLS) & Grant Access for Dashboard Client
ALTER TABLE public.activity_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write access via dashboard publishable key
CREATE POLICY "Allow public read access on activity_daily"
  ON public.activity_daily FOR SELECT USING (true);

CREATE POLICY "Allow public write access on activity_daily"
  ON public.activity_daily FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on posts"
  ON public.posts FOR SELECT USING (true);

CREATE POLICY "Allow public write access on posts"
  ON public.posts FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on user_goals"
  ON public.user_goals FOR SELECT USING (true);

CREATE POLICY "Allow public write access on user_goals"
  ON public.user_goals FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable Realtime Publications for Live WebSocket Updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_daily;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
