-- ============================================
-- Maciņš — RLS (Row Level Security) Migration
-- Multi-tenant: katrs lietotājs redz tikai savus datus
-- Palaid šo Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Ieslēgt RLS uz visām tabulām
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- 2. Notīrīt vecās politikas (ja eksistē)
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['categories','income_categories','expenses','incomes','recurring_expenses','debts'])
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- CATEGORIES
-- ============================================
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "categories_insert" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_update" ON categories
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_delete" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INCOME_CATEGORIES
-- ============================================
CREATE POLICY "income_categories_select" ON income_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "income_categories_insert" ON income_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "income_categories_update" ON income_categories
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "income_categories_delete" ON income_categories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- EXPENSES
-- ============================================
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INCOMES
-- ============================================
CREATE POLICY "incomes_select" ON incomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "incomes_insert" ON incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incomes_update" ON incomes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incomes_delete" ON incomes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RECURRING_EXPENSES
-- ============================================
CREATE POLICY "recurring_expenses_select" ON recurring_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "recurring_expenses_insert" ON recurring_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recurring_expenses_update" ON recurring_expenses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recurring_expenses_delete" ON recurring_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DEBTS
-- ============================================
CREATE POLICY "debts_select" ON debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "debts_insert" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "debts_update" ON debts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "debts_delete" ON debts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Verifikācija — pārbaudīt ka RLS ir aktīvs
-- ============================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('categories','income_categories','expenses','incomes','recurring_expenses','debts');
