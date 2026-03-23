import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  getTransactions, getCategories, getSettings, getMonthSummary,
  getIncomeSources, getSavingsEntries, getSavingsEntry,
} from '../lib/db';
import { Transaction, Category, Settings, MonthSummary, IncomeSource, SavingsEntry } from '../types';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  settings: Settings;
  summary: MonthSummary;
  currentMonth: string; // 'YYYY-MM'
  setCurrentMonth: (m: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  incomeSources: IncomeSource[];
  savingsHistory: SavingsEntry[];
  currentSavings: SavingsEntry | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings>({ monthlyIncome: 8000, currency: 'MAD', currencySymbol: 'د.م' });
  const [summary, setSummary] = useState<MonthSummary>({ totalIncome: 0, totalExpenses: 0, balance: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [savingsHistory, setSavingsHistory] = useState<SavingsEntry[]>([]);
  const [currentSavings, setCurrentSavings] = useState<SavingsEntry | null>(null);

  const refresh = useCallback(async () => {
    try {
      const todayMonth = format(new Date(), 'yyyy-MM');
      const [txns, cats, stgs, sum, sources, history, curSav] = await Promise.all([
        getTransactions(currentMonth),
        getCategories(),
        getSettings(),
        getMonthSummary(currentMonth),
        getIncomeSources(),
        getSavingsEntries(),                    // all months, no filter
        getSavingsEntry(todayMonth),            // today's real month only
      ]);
      setTransactions(txns);
      setCategories(cats);
      setSettings(stgs);
      setSummary(sum);
      setIncomeSources(sources);
      setSavingsHistory(history);
      setCurrentSavings(curSav);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <AppContext.Provider value={{
      transactions, categories, settings, summary,
      currentMonth, setCurrentMonth, refresh, loading,
      incomeSources, savingsHistory, currentSavings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
