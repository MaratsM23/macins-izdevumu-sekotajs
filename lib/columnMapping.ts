// Central column mapping: camelCase (Dexie) ↔ snake_case (Supabase)
// All sync functions MUST import from this file — no duplicated mapping logic.

/** Dexie table name → Supabase table name */
export const TABLE_MAP: Record<string, string> = {
  expenses: 'expenses',
  incomes: 'incomes',
  categories: 'categories',
  incomeCategories: 'income_categories',
  recurringExpenses: 'recurring_expenses',
  debts: 'debts',
};

/** Keys that exist only in Supabase and should be stripped when importing locally */
const SUPABASE_ONLY_KEYS = new Set(['user_id', 'data_source']);

/** Convert a single camelCase key to snake_case */
const toSnake = (key: string): string =>
  key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Convert a single snake_case key to camelCase */
const toCamel = (key: string): string =>
  key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Convert a local (camelCase) object to Supabase (snake_case).
 * Does NOT add user_id — caller must add it explicitly.
 */
export const camelToSnake = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    // Skip undefined and empty strings — sending '' as a UUID FK column
    // causes Postgres constraint violations
    if (val === undefined || val === '') continue;
    result[toSnake(key)] = val;
  }
  return result;
};

/**
 * Convert a Supabase (snake_case) row to local (camelCase).
 * Strips user_id and data_source — they don't exist in Dexie.
 */
export const snakeToCamel = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (SUPABASE_ONLY_KEYS.has(key)) continue;
    result[toCamel(key)] = obj[key];
  }
  return result;
};

/** Convert an array of Supabase rows to local format */
export const mapRowsToLocal = (rows: any[] | null): any[] =>
  rows ? rows.map(snakeToCamel) : [];
