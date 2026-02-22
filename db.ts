
import Dexie, { type Table } from 'dexie';
import { Expense, Category, RecurringExpense, Income, IncomeCategory, Debt } from './types';

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
  }
}

export const db = new AppDatabase();

export const DEFAULT_CATEGORIES = [
  'Pārtika', 
  'Pusdienas', 
  'Kafejnīcas', 
  'Transports', 
  'Car sharing',
  'Veselība', 
  'Abonementi', 
  'Izklaide', 
  'Kompulsīvie pirkumi',
  'Alko',
  'Māja', 
  'Bērni', 
  'Dāvanas', 
  'Kredīti',
  'Līzings',
  'Ieguldījumi',
  'Uzkrājumi',
  'Citi'
];

export const DEFAULT_INCOME_CATEGORIES = [
  'Alga',
  'Komandējums',
  'Bonuss',
  'Dāvana',
  'Pārdošana',
  'Citi'
];

export async function seedDatabase() {
  const catCount = await db.categories.count();
  if (catCount === 0) {
    const categories: Category[] = DEFAULT_CATEGORIES.map(name => ({
      id: crypto.randomUUID(),
      name,
      isArchived: false,
      isInvestment: ['Ieguldījumi', 'Uzkrājumi'].includes(name),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    await db.categories.bulkAdd(categories);
  }

  const incomeCatCount = await db.incomeCategories.count();
  if (incomeCatCount === 0) {
    const categories: IncomeCategory[] = DEFAULT_INCOME_CATEGORIES.map(name => ({
      id: crypto.randomUUID(),
      name,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    await db.incomeCategories.bulkAdd(categories);
  }
}
