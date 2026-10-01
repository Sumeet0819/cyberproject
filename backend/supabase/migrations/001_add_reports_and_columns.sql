-- ============================================================
-- MIGRATION: Add missing columns & tables
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add missing columns to the 'websites' table
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS score        INTEGER     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grade        TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create the 'reports' table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.reports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id       UUID        NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  score            INTEGER     NOT NULL,
  grade            TEXT        NOT NULL,
  ai_summary       TEXT,
  ai_key_takeaways JSONB       DEFAULT '[]',
  findings         JSONB       DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Index for fast lookup by website_id and ordering
CREATE INDEX IF NOT EXISTS idx_reports_website_id ON public.reports(website_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- 4. Enable Row Level Security on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: users can only read their own reports (via website ownership)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reports' AND policyname = 'Users can view their own reports'
  ) THEN
    CREATE POLICY "Users can view their own reports"
      ON public.reports
      FOR SELECT
      USING (
        website_id IN (
          SELECT id FROM public.websites WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Done! Re-run your scan after applying this migration.
