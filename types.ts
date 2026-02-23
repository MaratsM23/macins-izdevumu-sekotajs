
export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  sortOrder?: number;
  isArchived: boolean;
  isInvestment?: boolean;
  targetAmount?: number;
  monthlyBudget?: number;
  initialBalance?: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface IncomeCategory {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  categoryId: string | null;
  note?: string;
  debtId?: string; // Link to a debt record if this transaction is a repayment
  sourceCategoryId?: string; // Link to a Savings Category (Expense Cat) if this is a withdrawal
  createdAt: number;
  updatedAt: number;
}

export interface Expense extends Transaction {}
export interface Income extends Transaction {}

export type TransactionType = 'expense' | 'income';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringExpense {
  id: string;
  amount: number;
  categoryId: string;
  frequency: Frequency;
  startDate: string; // YYYY-MM-DD
  lastGeneratedDate?: string; // YYYY-MM-DD
  note?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Debt {
  id: string;
  title: string;
  totalAmount: number; // Original amount borrowed
  remainingAmount: number; // Current balance
  monthlyPayment: number; // Minimum or expected monthly payment
  dueDateDay: number; // Day of month (1-31)
  categoryId?: string; // Usually 'Kredīti', optional — null-safe for Supabase FK
  isPaidOff: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TabType = 'add' | 'history' | 'finance' | 'reports' | 'settings';

export interface ReportData {
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface DailySpending {
  date: string;
  amount: number;
}
