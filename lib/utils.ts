import { format, parseISO, getDaysInMonth, getDate } from 'date-fns';
import { fr } from 'date-fns/locale';

export function fmtAmount(amount: number, symbol = 'د.م'): string {
  return `${Math.round(amount).toLocaleString('fr-MA')} ${symbol}`;
}

export function fmtDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy', { locale: fr });
}

export function currentMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const d = new Date(parseInt(year), parseInt(m) - 1, 1);
  return format(d, 'MMMM yyyy', { locale: fr });
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getDayProgress(month: string): { dayOfMonth: number; daysInMonth: number; pct: number } {
  const [year, m] = month.split('-');
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === parseInt(year) && now.getMonth() + 1 === parseInt(m);

  const daysInMonth = getDaysInMonth(new Date(parseInt(year), parseInt(m) - 1));
  const dayOfMonth = isCurrentMonth ? getDate(now) : daysInMonth;
  return { dayOfMonth, daysInMonth, pct: Math.round((dayOfMonth / daysInMonth) * 100) };
}

export function projectEndOfMonth(spentSoFar: number, dayOfMonth: number, daysInMonth: number): number {
  if (dayOfMonth === 0) return 0;
  return Math.round((spentSoFar / dayOfMonth) * daysInMonth);
}

export const PALETTE = [
  '#185FA5', '#1D9E75', '#BA7517', '#993556',
  '#0F6E56', '#7F77DD', '#D85A30', '#3B6D11',
  '#A32D2D', '#888780',
];

export function getCategoryColor(categories: { name: string; color: string }[], name: string): string {
  return categories.find(c => c.name === name)?.color ?? '#888780';
}
