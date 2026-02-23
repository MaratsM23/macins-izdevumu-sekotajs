-- ============================================================
-- Maciņš — Phase 2 Migration: Supabase as Primary DB + AI Foundation
-- Run this in Supabase SQL Editor AFTER the initial schema (supabase-schema.sql)
-- ============================================================

-- ─── 1. Add data_source column to all existing tables ───────
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'manual';
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'manual';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'manual';
ALTER TABLE income_categories ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'manual';
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'manual';
ALTER TABLE debts ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'manual';

-- ─── 2. User Profiles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name text,
  currency text DEFAULT 'EUR',
  onboarding_completed_at timestamptz,
  ai_eligible_at timestamptz,
  data_quality_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── 3. User Consents (GDPR) ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  policy_version text NOT NULL DEFAULT '2.2'
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consents"
  ON user_consents FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own consents"
  ON user_consents FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own consents"
  ON user_consents FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- ─── 4. Deletion Requests (audit trail) ────────────────────
CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'pending'
);

-- No RLS on deletion_requests — records persist after user deletion
-- Only service role should read these (admin/audit)

-- ─── 5. Auto-create profile + consent on registration ──────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id)
  VALUES (NEW.id);

  INSERT INTO user_consents (user_id, consent_type, granted, policy_version)
  VALUES (NEW.id, 'core_storage', true, '2.2');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 6. Updated delete_user() RPC ──────────────────────────
-- Deletes all user data. Does NOT delete from auth.users (that requires admin API).
-- CASCADE on auth.users FK will handle cleanup if admin deletes the auth user later.
CREATE OR REPLACE FUNCTION delete_user() RETURNS void AS $$
BEGIN
  DELETE FROM expenses WHERE user_id = auth.uid();
  DELETE FROM incomes WHERE user_id = auth.uid();
  DELETE FROM recurring_expenses WHERE user_id = auth.uid();
  DELETE FROM debts WHERE user_id = auth.uid();
  DELETE FROM categories WHERE user_id = auth.uid();
  DELETE FROM income_categories WHERE user_id = auth.uid();
  DELETE FROM user_consents WHERE user_id = auth.uid();
  DELETE FROM user_profiles WHERE user_id = auth.uid();

  INSERT INTO deletion_requests (user_id, status, completed_at)
  VALUES (auth.uid(), 'completed', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
