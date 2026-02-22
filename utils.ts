
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
  if (!Array.isArray(data.expenses) || !Array.isArray(data.categories)) return false;
  
  for (const exp of data.expenses) {
    if (!exp.id || typeof exp.amount !== 'number' || !exp.date || !exp.categoryId) return false;
  }
  
  for (const cat of data.categories) {
    if (!cat.id || !cat.name) return false;
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
