import { Transaction } from '../types';

export interface Habit {
  name: string;
  keywords: string[];
  icon: string;
}

export const HABITS: Habit[] = [
  { name: 'Daily Coffee', keywords: ['starbucks', 'coffee', 'cafe'], icon: '☕' },
  { name: 'Lunch Out', keywords: ['lunch', 'chipotle', 'subway', 'panera'], icon: '🥗' },
  { name: 'Ride Share', keywords: ['uber', 'lyft'], icon: '🚗' },
  { name: 'Food Delivery', keywords: ['doordash', 'uber eats', 'grubhub'], icon: '🍔' },
  { name: 'Impulse Amazon', keywords: ['amazon'], icon: '📦' },
  { name: 'Bar/Drinks', keywords: ['bar', 'brewery', 'wine', 'liquor'], icon: '🍺' },
];

const getUniqueMonths = (transactions: Transaction[]): number => {
  const months = new Set<string>();
  transactions.forEach(t => {
    if (t.date && t.date.length >= 7) {
      months.add(t.date.substring(0, 7));
    }
  });
  return Math.max(1, months.size || 1);
};

export interface HabitTaxResult {
  habit: string;
  icon: string;
  frequency: number;
  monthlySpend: number;
  annualSpend: number;
  observedTotal: number;
  oneYear: number;
  fiveYears: number;
  tenYears: number;
  thirtyYears: number;
  equivalents: { item: string; cost: number; emoji: string; count: number }[];
}

export const calculateHabitTax = (
  transactions: Transaction[],
  habit: Habit,
): HabitTaxResult | null => {
  const matches = transactions.filter(t =>
    habit.keywords.some(kw => t.description.toLowerCase().includes(kw)),
  );

  if (matches.length === 0) return null;

  const totalSpent = matches.reduce((sum, t) => sum + t.amount, 0);
  const frequency = matches.length;

  const monthsInData = getUniqueMonths(transactions);
  const monthlyRate = frequency / monthsInData;
  const monthlySpend = totalSpent / monthsInData;
  const annualSpend = monthlySpend * 12;

  const oneYear = annualSpend;
  const fiveYears = calculateFutureValue(annualSpend, 0.05, 5);
  const tenYears = calculateFutureValue(annualSpend, 0.07, 10);
  const thirtyYears = calculateFutureValue(annualSpend, 0.07, 30);

  return {
    habit: habit.name,
    icon: habit.icon,
    frequency: Math.round(monthlyRate),
    monthlySpend,
    annualSpend,
    observedTotal: totalSpent,
    oneYear,
    fiveYears,
    tenYears,
    thirtyYears,
    equivalents: getEquivalents(annualSpend),
  };
};

export const calculateFutureValue = (
  annualPayment: number,
  rate: number,
  years: number,
): number => {
  if (rate === 0) return annualPayment * years;
  return annualPayment * (((Math.pow(1 + rate, years) - 1) / rate) * (1 + rate));
};

export const getEquivalents = (annualAmount: number) => {
  const equivalents = [
    { item: 'Spotify Premium subscriptions', cost: 144, emoji: '🎵' },
    { item: 'Nice restaurant dinners', cost: 100, emoji: '🍽️' },
    { item: 'Weekend getaway trips', cost: 500, emoji: '✈️' },
    { item: 'Brand new Macbook Pros', cost: 2000, emoji: '💻' },
    { item: 'Used Honda Civics', cost: 15000, emoji: '🚗' },
  ];

  return equivalents
    .filter(e => annualAmount >= e.cost)
    .map(e => ({
      ...e,
      count: Math.floor(annualAmount / e.cost),
    }));
};

export interface ParetoMerchantPoint {
  name: string;
  total: number;
  percentage: number;
  cumulative: number;
}

export interface ParetoResult {
  merchants: ParetoMerchantPoint[];
  percentage: number;
  insight: string;
}

export const findPareto = (transactions: Transaction[]): ParetoResult => {
  const merchantTotals = new Map<string, number>();

  transactions.forEach(t => {
    const merchant = t.merchantName || t.description;
    merchantTotals.set(merchant, (merchantTotals.get(merchant) || 0) + t.amount);
  });

  const sorted = Array.from(merchantTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return { merchants: [], percentage: 0, insight: 'No spending data available.' };
  }

  const totalSpend = sorted.reduce((sum, m) => sum + m.total, 0);
  const eightyPercent = totalSpend * 0.8;

  let cumulative = 0;
  let count = 0;
  const topMerchants: ParetoMerchantPoint[] = [];

  while (cumulative < eightyPercent && count < sorted.length) {
    cumulative += sorted[count].total;
    topMerchants.push({
      name: sorted[count].name,
      total: sorted[count].total,
      percentage: (sorted[count].total / totalSpend) * 100,
      cumulative: (cumulative / totalSpend) * 100,
    });
    count++;
  }

  return {
    merchants: topMerchants,
    percentage: (count / sorted.length) * 100,
    insight: `Just ${count} merchants (${Math.round((count / sorted.length) * 100)}%) represent 80% of your spending. Focus here to make the biggest impact.`,
  };
};

export interface ParetoCategoryPoint {
  name: string;
  total: number;
  percentage: number;
  cumulative: number;
}

export interface ParetoByCategoryResult {
  categories: ParetoCategoryPoint[];
  percentage: number;
}

export const findParetoByCategory = (transactions: Transaction[]): ParetoByCategoryResult => {
  const categoryTotals = new Map<string, number>();

  transactions.forEach(t => {
    const category = t.category || 'Uncategorized';
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + t.amount);
  });

  const sorted = Array.from(categoryTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return { categories: [], percentage: 0 };
  }

  const totalSpend = sorted.reduce((sum, c) => sum + c.total, 0);
  const eightyPercent = totalSpend * 0.8;

  let cumulative = 0;
  let count = 0;
  const topCategories: ParetoCategoryPoint[] = [];

  while (cumulative < eightyPercent && count < sorted.length) {
    cumulative += sorted[count].total;
    topCategories.push({
      name: sorted[count].name,
      total: sorted[count].total,
      percentage: (sorted[count].total / totalSpend) * 100,
      cumulative: (cumulative / totalSpend) * 100,
    });
    count++;
  }

  return {
    categories: topCategories,
    percentage: (count / sorted.length) * 100,
  };
};

export interface LifestyleInflationResult {
  inflationRate: number;
  earlyAvg: number;
  recentAvg: number;
  monthlyIncrease: number;
  annualImpact: number;
  topIncreases: [string, number][];
  trend: { month: string; total: number }[];
}

export const detectLifestyleInflation = (
  transactions: Transaction[],
): LifestyleInflationResult | null => {
  const monthlyData = new Map<string, Transaction[]>();

  transactions.forEach(t => {
    const monthKey = t.date.substring(0, 7);
    if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, []);
    monthlyData.get(monthKey)!.push(t);
  });

  const sorted = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length < 3) return null;

  const earlyMonths = sorted.slice(0, 3);
  const recentMonths = sorted.slice(-3);

  const earlyAvg =
    earlyMonths.reduce(
      (sum, [_, txs]) => sum + txs.reduce((s, t) => s + t.amount, 0),
      0,
    ) / earlyMonths.length;

  const recentAvg =
    recentMonths.reduce(
      (sum, [_, txs]) => sum + txs.reduce((s, t) => s + t.amount, 0),
      0,
    ) / recentMonths.length;

  if (earlyAvg === 0) return null;

  const inflationRate = ((recentAvg - earlyAvg) / earlyAvg) * 100;

  const categoryChanges = new Map<string, number>();
  const categories = Array.from(new Set(transactions.map(t => t.category)));

  categories.forEach(cat => {
    const earlySpend =
      earlyMonths.reduce(
        (sum, [_, txs]) =>
          sum + txs.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0),
        0,
      ) / earlyMonths.length;

    const recentSpend =
      recentMonths.reduce(
        (sum, [_, txs]) =>
          sum + txs.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0),
        0,
      ) / recentMonths.length;

    if (earlySpend > 0) {
      const change = ((recentSpend - earlySpend) / earlySpend) * 100;
      categoryChanges.set(cat, change);
    }
  });

  const sortedChanges = Array.from(categoryChanges.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const trend = sorted.map(([month, txs]) => ({
    month,
    total: txs.reduce((sum, t) => sum + t.amount, 0),
  }));

  return {
    inflationRate,
    earlyAvg,
    recentAvg,
    monthlyIncrease: recentAvg - earlyAvg,
    annualImpact: (recentAvg - earlyAvg) * 12,
    topIncreases: sortedChanges,
    trend,
  };
};
