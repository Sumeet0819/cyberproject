-- ============================================================
-- MIGRATION 002: Add Domain Verification Columns to Websites
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS is_verified          BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token   TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_at          TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_method  TEXT        DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_websites_verification_token ON public.websites(verification_token);
CREATE INDEX IF NOT EXISTS idx_websites_is_verified ON public.websites(is_verified);
