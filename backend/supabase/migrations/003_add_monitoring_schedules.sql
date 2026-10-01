-- ============================================================
-- MIGRATION 003: Add Autonomous Continuous Monitoring to Websites
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS monitoring_enabled   BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS monitoring_frequency TEXT        DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS last_monitored_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notification_email   TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_url          TEXT        DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_websites_monitoring ON public.websites(monitoring_enabled, last_monitored_at);
