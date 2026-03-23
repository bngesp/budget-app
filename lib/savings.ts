/**
 * Calculate months needed to reach a savings goal.
 * Returns Infinity if the goal cannot be reached within 600 months (50 years).
 */
export function calcMonthsToGoal(
  target: number,
  alreadySaved: number,
  monthlyAmount: number,
  annualRate: number
): number {
  if (monthlyAmount <= 0) return Infinity;
  const remaining = target - alreadySaved;
  if (remaining <= 0) return 0;

  const r = annualRate / 100 / 12;

  if (r === 0) {
    return Math.ceil(remaining / monthlyAmount);
  }

  let balance = alreadySaved;
  let mois_nécessaires = 0;
  while (balance < target && mois_nécessaires < 600) {
    balance = balance * (1 + r) + monthlyAmount;
    mois_nécessaires++;
  }
  return mois_nécessaires >= 600 ? Infinity : mois_nécessaires;
}

/**
 * Format months as "X ans Y mois" (French).
 */
export function formatDuration(months: number): string {
  if (!isFinite(months)) return 'Objectif non atteignable en 50 ans';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mois`;
  if (rem === 0) return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} an${years > 1 ? 's' : ''} ${rem} mois`;
}

/**
 * Estimate the target date from today + N months (French locale).
 */
export function targetDate(months: number): string | null {
  if (!isFinite(months)) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' });
}

/**
 * Round a number to the nearest hundred.
 */
export function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

/**
 * Calculate future value of regular savings over N months.
 * Handles r === 0 safely (no division by zero).
 */
export function calcFutureValue(
  monthlyAmount: number,
  initialCapital: number,
  months: number,
  annualRate: number
): number {
  const r = annualRate / 100 / 12;
  if (r === 0) {
    return initialCapital + monthlyAmount * months;
  }
  return (
    monthlyAmount * ((Math.pow(1 + r, months) - 1) / r) +
    initialCapital * Math.pow(1 + r, months)
  );
}

/**
 * Calculate interest earned (FV minus pure contributions).
 */
export function calcInterestEarned(
  fv: number,
  monthlyAmount: number,
  initialCapital: number,
  months: number
): number {
  return fv - initialCapital - monthlyAmount * months;
}
