
import { Expense, Category } from './types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lv-LV', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const parseAmount = (input: string): number => {
  const normalized = input.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

export const getTodayStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Converts YYYY-MM-DD to DD.MM.YYYY
export const formatDateLV = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr; // Return original if not valid
  const [year, month, day] = parts;
  return `${day}.${month}.${year}`;
};

export const validateImportData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;

  const ensureArray = (value: unknown) => value === undefined || Array.isArray(value);
  if (!Array.isArray(data.expenses) || !Array.isArray(data.categories)) return false;
  if (!ensureArray(data.incomes) || !ensureArray(data.incomeCategories) || !ensureArray(data.recurringExpenses) || !ensureArray(data.debts)) {
    return false;
  }

  for (const exp of data.expenses) {
    if (!exp?.id || typeof exp.amount !== 'number' || !exp.date || !exp.categoryId) return false;
  }

  for (const inc of data.incomes || []) {
    if (!inc?.id || typeof inc.amount !== 'number' || !inc.date || !inc.categoryId) return false;
  }

  for (const cat of data.categories) {
    if (!cat?.id || !cat.name || typeof cat.isArchived !== 'boolean') return false;
  }

  for (const cat of data.incomeCategories || []) {
    if (!cat?.id || !cat.name || typeof cat.isArchived !== 'boolean') return false;
  }

  for (const rec of data.recurringExpenses || []) {
    if (!rec?.id || typeof rec.amount !== 'number' || !rec.categoryId || !rec.startDate || typeof rec.isActive !== 'boolean') return false;
  }

  for (const debt of data.debts || []) {
    if (!debt?.id || !debt.title || typeof debt.totalAmount !== 'number' || typeof debt.remainingAmount !== 'number') return false;
  }

  return true;
};

export const getRemainingDaysInMonth = (): number => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1; // +1 to include today
};

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};
