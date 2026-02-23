
import Dexie, { type Table } from 'dexie';
import { Expense, Category, RecurringExpense, Income, IncomeCategory, Debt } from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import { camelToSnake } from './lib/columnMapping';

export class AppDatabase extends Dexie {
  expenses!: Table<Expense>;
  incomes!: Table<Income>;
  categories!: Table<Category>;
  incomeCategories!: Table<IncomeCategory>;
  recurringExpenses!: Table<RecurringExpense>;
  debts!: Table<Debt>;

  constructor() {
    super('MaciņšDB');
    (this as any).version(7).stores({
      expenses: 'id, date, categoryId, debtId',
      incomes: 'id, date, categoryId, sourceCategoryId',
      categories: 'id, name, isArchived, isInvestment',
      incomeCategories: 'id, name, isArchived',
      recurringExpenses: 'id, categoryId, isActive',
      debts: 'id, isPaidOff'
    });
    (this as any).version(8).stores({
      expenses: 'id, date, categoryId, debtId',
      incomes: 'id, date, categoryId, sourceCategoryId',
      categories: 'id, name, isArchived, isInvestment, sortOrder',
      incomeCategories: 'id, name, isArchived',
      recurringExpenses: 'id, categoryId, isActive',
      debts: 'id, isPaidOff'
    });
    (this as any).version(9).stores({
      expenses: 'id, date, categoryId, debtId',
      incomes: 'id, date, categoryId, sourceCategoryId',
      categories: 'id, name, isArchived, isInvestment, sortOrder',
      incomeCategories: 'id, name, isArchived',
      recurringExpenses: 'id, categoryId, isActive',
      debts: 'id, isPaidOff',
      _syncQueue: 'id, table, failedAt'
    });
  }
}

export const db = new AppDatabase();

export const DEFAULT_CATEGORIES: { name: string }[] = [
  { name: '🛒 Pārtika' },
  { name: '🚗 Transports' },
  { name: '🏠 Mājoklis' },
  { name: '🎉 Izklaide' },
  { name: '👕 Apģērbs' },
  { name: '💊 Veselība' },
  { name: '📦 Cits' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  '💼 Alga',
  '💰 Cits ienākums',
];

export async function seedDatabase(userId?: string) {
  const now = Date.now();

  const catCount = await db.categories.count();
  if (catCount === 0) {
    const categories: Category[] = DEFAULT_CATEGORIES.map(cat => ({
      id: crypto.randomUUID(),
      name: cat.name,
      icon: null,
      sortOrder: 0,
      isArchived: false,
      isInvestment: false,
      createdAt: now,
      updatedAt: now,
    }));
    await db.categories.bulkAdd(categories);

    if (userId && isSupabaseConfigured) {
      const rows = categories.map(c => ({ ...camelToSnake(c), user_id: userId }));
      const { error } = await supabase.from('categories').upsert(rows);
      if (error) console.error('seedDatabase: categories upsert failed', error);
    }
  }

  const incomeCatCount = await db.incomeCategories.count();
  if (incomeCatCount === 0) {
    const incomeCategories: IncomeCategory[] = DEFAULT_INCOME_CATEGORIES.map(name => ({
      id: crypto.randomUUID(),
      name,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    }));
    await db.incomeCategories.bulkAdd(incomeCategories);

    if (userId && isSupabaseConfigured) {
      const rows = incomeCategories.map(c => ({ ...camelToSnake(c), user_id: userId }));
      const { error } = await supabase.from('income_categories').upsert(rows);
      if (error) console.error('seedDatabase: income_categories upsert failed', error);
    }
  }
}
