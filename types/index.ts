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
