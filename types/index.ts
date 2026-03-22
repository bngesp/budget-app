export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO string YYYY-MM-DD
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  budget: number;
  color: string;
  icon: string;
  type: 'expense' | 'income' | 'both';
}

export interface Settings {
  monthlyIncome: number;
  currency: string;
  currencySymbol: string;
}

export interface MonthSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: Record<string, number>;
}

export interface IncomeSource {
  id: number;
  name: string;
  amount: number;
  icon: string;
  active: number; // 1 = active, 0 = suspended
}

export interface SavingsEntry {
  id: number;
  month: string;        // 'YYYY-MM'
  calculated: number;
  actual: number | null; // null means not yet entered, display `calculated`
  note: string | null;
}
