-- SQL Schema for "Maciņš" Supabase Database
-- Run this in your Supabase SQL Editor

-- Run this to enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    is_investment BOOLEAN DEFAULT false,
    target_amount NUMERIC,
    initial_balance NUMERIC,
    description TEXT,
    monthly_budget NUMERIC,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 2. Income Categories Table
CREATE TABLE income_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 3. Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'EUR',
    date DATE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    note TEXT,
    debt_id UUID, -- We will create debts table later, omitting direct foreign key for flexibility if debt is deleted
    source_category_id UUID,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 4. Incomes Table
CREATE TABLE incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'EUR',
    date DATE NOT NULL,
    category_id UUID REFERENCES income_categories(id) ON DELETE SET NULL,
    note TEXT,
    source_category_id UUID,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 5. Recurring Expenses Table
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    start_date DATE NOT NULL,
    last_generated_date DATE,
    note TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at BIGINT NOT NULL
);

-- 6. Debts Table
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    monthly_payment NUMERIC NOT NULL,
    due_date_day INTEGER NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_paid_off BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- RLS (Row Level Security) Policies
-- This ensures users can only see and edit their own data

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Helper function to create RLS policies
CREATE OR REPLACE FUNCTION create_user_policy(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE format('CREATE POLICY "Users can only access their own %I" ON %I FOR ALL USING (auth.uid() = user_id);', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

SELECT create_user_policy('categories');
SELECT create_user_policy('income_categories');
SELECT create_user_policy('expenses');
SELECT create_user_policy('incomes');
SELECT create_user_policy('recurring_expenses');
SELECT create_user_policy('debts');

-- Function to allow users to delete their own account
-- SECURITY DEFINER runs with owner (postgres) privileges to delete from auth.users
-- CASCADE on foreign keys will automatically delete all user data
CREATE OR REPLACE FUNCTION delete_user() RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
