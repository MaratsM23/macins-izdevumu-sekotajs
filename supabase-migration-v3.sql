-- ============================================================
-- Maciņš — Phase 3 Fixes: Diagnostic findings (Indexes & Security)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── 1. Add missing indexes on user_id foreign keys ──────────
-- These are critical for RLS performance on large tables.
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_income_categories_user_id ON income_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);

-- ─── 2. Fix SECURITY DEFINER in delete_user() ────────────────
-- Set search_path = public to prevent malicious search_path manipulation.
-- Optimization: Because of the CASCADE ON DELETE user_id REFERENCES auth.users(id), 
-- deleting the auth.users record or relying on foreign keys is better. 
-- But since we cannot delete from auth.users via RPC safely without admin roles,
-- we perform manual deletes. The indexes created above ensure this won't timeout.
CREATE OR REPLACE FUNCTION delete_user() RETURNS void
SET search_path = public
AS $$
BEGIN
  -- Perform deletes. Thanks to the new indexes, this will be fast.
  DELETE FROM expenses WHERE user_id = auth.uid();
  DELETE FROM incomes WHERE user_id = auth.uid();
  DELETE FROM recurring_expenses WHERE user_id = auth.uid();
  DELETE FROM debts WHERE user_id = auth.uid();
  DELETE FROM categories WHERE user_id = auth.uid();
  DELETE FROM income_categories WHERE user_id = auth.uid();
  DELETE FROM user_consents WHERE user_id = auth.uid();
  DELETE FROM user_profiles WHERE user_id = auth.uid();

  -- Log deletion request for audit (if admin wants to delete auth.users later)
  INSERT INTO deletion_requests (user_id, status, completed_at)
  VALUES (auth.uid(), 'completed', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Fix error swallowing in handle_new_user() ────────────
-- Use an EXCEPTION block so that if inserting into user_profiles or user_consents
-- fails, the transaction doesn't abort the entire auth signup process.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO user_profiles (user_id)
    VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create user_profile for user %', NEW.id;
  END;

  BEGIN
    INSERT INTO user_consents (user_id, consent_type, granted, policy_version)
    VALUES (NEW.id, 'core_storage', true, '2.2');
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create user_consents for user %', NEW.id;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
