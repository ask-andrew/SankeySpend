import { Transaction } from '../types';

export interface Habit {
  name: string;
  keywords: string[];
  icon: string;
  aliases?: string[]; // Alternative names for the same merchants
}

// MASSIVELY EXPANDED habit tracking with more comprehensive keyword matching
export const HABITS: Habit[] = [
  { 
    name: 'Daily Coffee', 
    keywords: ['starbucks', 'coffee', 'cafe', 'espresso', 'dunkin', 'dutch bros', 'peets', 'caribou', 'tim hortons', 'costa', 'lavazza'],
    aliases: ['sbux', 'dunkin donuts', 'dd', 'dutch'],
    icon: '☕' 
  },
  { 
    name: 'Lunch Out', 
    keywords: ['lunch', 'chipotle', 'subway', 'panera', 'sweetgreen', 'cava', 'dig', 'chopt', 'salad', 'pret', 'au bon pain', 'potbelly', 'jimmy johns', 'jersey mikes', 'firehouse subs', 'quiznos'],
    aliases: ['panera bread', 'sweet green'],
    icon: '🥗' 
  },
  { 
    name: 'Ride Share', 
    keywords: ['uber', 'lyft', 'rideshare', 'ride share', 'taxi', 'cab'],
    aliases: ['uber trip', 'lyft ride'],
    icon: '🚗' 
  },
  { 
    name: 'Food Delivery', 
    keywords: ['doordash', 'uber eats', 'grubhub', 'postmates', 'seamless', 'delivery', 'caviar', 'instacart'],
    aliases: ['door dash', 'uber-eats'],
    icon: '🍔' 
  },
  { 
    name: 'Impulse Amazon', 
    keywords: ['amazon', 'amzn', 'prime'],
    aliases: ['amazon.com', 'amazon prime'],
    icon: '📦' 
  },
  { 
    name: 'Bar/Drinks', 
    keywords: ['bar', 'brewery', 'wine', 'liquor', 'pub', 'tavern', 'brewpub', 'taproom', 'distillery', 'winery', 'spirits', 'cocktail', 'lounge'],
    aliases: ['wine shop', 'liquor store', 'total wine'],
    icon: '🍺' 
  },
  {
    name: 'Fast Food',
    keywords: ['mcdonalds', 'burger king', 'wendys', 'taco bell', 'kfc', 'popeyes', 'chick-fil-a', 'five guys', 'shake shack', 'in-n-out', 'whataburger', 'sonic', 'arbys', 'jack in the box', 'del taco', 'white castle', 'hardees', 'carls jr'],
    aliases: ['mcds', 'bk', 'chickfila', 'cfa'],
    icon: '🍟'
  },
  {
    name: 'Streaming Services',
    keywords: ['netflix', 'hulu', 'disney+', 'hbo max', 'paramount+', 'peacock', 'apple tv', 'amazon prime video', 'youtube premium', 'crunchyroll', 'funimation', 'showtime', 'starz'],
    aliases: ['disney plus', 'hbo-max', 'apple tv+'],
    icon: '📺'
  },
  {
    name: 'Music Subscriptions',
    keywords: ['spotify', 'apple music', 'amazon music', 'youtube music', 'tidal', 'pandora', 'soundcloud'],
    aliases: ['spotify premium'],
    icon: '🎵'
  },
  {
    name: 'Gaming',
    keywords: ['steam', 'playstation', 'xbox', 'nintendo', 'epic games', 'twitch', 'discord nitro', 'game pass', 'psn', 'eshop'],
    aliases: ['ps store', 'microsoft store', 'nintendo eshop'],
    icon: '🎮'
  },
  {
    name: 'Gym/Fitness',
    keywords: ['gym', 'fitness', 'equinox', 'planet fitness', 'la fitness', '24 hour fitness', 'lifetime fitness', 'orangetheory', 'crossfit', 'yoga', 'pilates', 'peloton', 'soulcycle', 'pure barre'],
    aliases: ['24hr fitness', 'orange theory'],
    icon: '💪'
  },
  {
    name: 'Convenience Store Snacks',
    keywords: ['7-eleven', 'wawa', 'sheetz', 'quicktrip', 'circle k', 'speedway', 'gas station', 'convenience'],
    aliases: ['7-11', '7 eleven', 'qt'],
    icon: '🏪'
  },
  {
    name: 'Vending Machines',
    keywords: ['vending', 'canteen', 'snack machine'],
    icon: '🎰'
  },
  {
    name: 'Parking Fees',
    keywords: ['parking', 'parkwhiz', 'spothero', 'parking meter', 'garage'],
    aliases: ['park whiz', 'spot hero'],
    icon: '🅿️'
  },
  {
    name: 'ATM Fees',
    keywords: ['atm fee', 'atm withdrawal fee', 'out-of-network', 'surcharge'],
    icon: '🏧'
  },
  {
    name: 'Late Fees',
    keywords: ['late fee', 'late charge', 'penalty', 'overdraft'],
    icon: '⚠️'
  },
  {
    name: 'Impulse Retail',
    keywords: ['target', 'walmart', 'costco', 'cvs', 'walgreens', 'rite aid', 'dollar store', 'tj maxx', 'marshalls', 'ross'],
    aliases: ['super target', 'walmart supercenter', 'tjmaxx'],
    icon: '🛒'
  },
  {
    name: 'Online Shopping',
    keywords: ['ebay', 'etsy', 'wayfair', 'overstock', 'wish', 'aliexpress', 'shein', 'temu'],
    icon: '💳'
  }
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

// Enhanced matching function that checks both keywords and aliases
const matchesHabit = (transaction: Transaction, habit: Habit): boolean => {
  const desc = transaction.description.toLowerCase();
  const merchant = (transaction.merchantName || '').toLowerCase();
  
  // Check main keywords
  const keywordMatch = habit.keywords.some(kw => 
    desc.includes(kw) || merchant.includes(kw)
  );
  
  // Check aliases if they exist
  const aliasMatch = habit.aliases?.some(alias => 
    desc.includes(alias.toLowerCase()) || merchant.includes(alias.toLowerCase())
  ) || false;
  
  return keywordMatch || aliasMatch;
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
  perOccurrence: number; // Average cost per transaction
  trend: 'increasing' | 'decreasing' | 'stable'; // Spending trend
}

export const calculateHabitTax = (
  transactions: Transaction[],
  habit: Habit,
): HabitTaxResult | null => {
  const matches = transactions.filter(t => matchesHabit(t, habit));

  if (matches.length === 0) return null;

  const totalSpent = matches.reduce((sum, t) => sum + t.amount, 0);
  const frequency = matches.length;

  const monthsInData = getUniqueMonths(transactions);
  const monthlyRate = frequency / monthsInData;
  const monthlySpend = totalSpent / monthsInData;
  const annualSpend = monthlySpend * 12;
  const perOccurrence = totalSpent / frequency;

  // Calculate trend
  const sortedMatches = [...matches].sort((a, b) => a.date.localeCompare(b.date));
  const halfPoint = Math.floor(sortedMatches.length / 2);
  const firstHalf = sortedMatches.slice(0, halfPoint);
  const secondHalf = sortedMatches.slice(halfPoint);
  
  const firstHalfAvg = firstHalf.length > 0 
    ? firstHalf.reduce((sum, t) => sum + t.amount, 0) / firstHalf.length 
    : 0;
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, t) => sum + t.amount, 0) / secondHalf.length
    : 0;
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (firstHalfAvg > 0) {
    const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    if (change > 15) trend = 'increasing';
    else if (change < -15) trend = 'decreasing';
  }

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
    perOccurrence,
    trend
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
    { item: 'Gym memberships', cost: 360, emoji: '💪' },
    { item: 'Weekend getaway trips', cost: 500, emoji: '✈️' },
    { item: 'New gaming consoles', cost: 500, emoji: '🎮' },
    { item: 'Designer handbags', cost: 1200, emoji: '👜' },
    { item: 'Brand new Macbook Pros', cost: 2000, emoji: '💻' },
    { item: 'Nice vacation packages', cost: 3000, emoji: '🏖️' },
    { item: 'Down payment assistance', cost: 10000, emoji: '🏠' },
    { item: 'Used Honda Civics', cost: 15000, emoji: '🚗' },
  ];

  return equivalents
    .filter(e => annualAmount >= e.cost)
    .map(e => ({
      ...e,
      count: Math.floor(annualAmount / e.cost),
    }))
    .slice(0, 3); // Return top 3 most relevant equivalents
};

export interface ParetoMerchantPoint {
  name: string;
  total: number;
  percentage: number;
  cumulative: number;
  transactionCount: number; // How many times they visited
  avgTransaction: number; // Average spend per visit
}

export interface ParetoResult {
  merchants: ParetoMerchantPoint[];
  percentage: number;
  insight: string;
  topMerchant: string;
  topMerchantSpend: number;
}

export const findPareto = (transactions: Transaction[]): ParetoResult => {
  const merchantData = new Map<string, { total: number; count: number }>();

  transactions.forEach(t => {
    const merchant = t.merchantName || t.description;
    const existing = merchantData.get(merchant) || { total: 0, count: 0 };
    merchantData.set(merchant, {
      total: existing.total + t.amount,
      count: existing.count + 1
    });
  });

  const sorted = Array.from(merchantData.entries())
    .map(([name, data]) => ({ 
      name, 
      total: data.total,
      transactionCount: data.count,
      avgTransaction: data.total / data.count
    }))
    .sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return { 
      merchants: [], 
      percentage: 0, 
      insight: 'No spending data available.',
      topMerchant: '',
      topMerchantSpend: 0
    };
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
      transactionCount: sorted[count].transactionCount,
      avgTransaction: sorted[count].avgTransaction
    });
    count++;
  }

  const paretoPercentage = (count / sorted.length) * 100;
  let insightText = `Just ${count} merchants (${Math.round(paretoPercentage)}%) represent 80% of your spending.`;
  
  if (paretoPercentage < 20) {
    insightText += ' Your spending is highly concentrated—small changes here have big impact.';
  } else if (paretoPercentage > 40) {
    insightText += ' Your spending is well-diversified across many merchants.';
  } else {
    insightText += ' Focus here to make the biggest impact.';
  }

  return {
    merchants: topMerchants,
    percentage: paretoPercentage,
    insight: insightText,
    topMerchant: sorted[0]?.name || '',
    topMerchantSpend: sorted[0]?.total || 0
  };
};

export interface ParetoCategoryPoint {
  name: string;
  total: number;
  percentage: number;
  cumulative: number;
  transactionCount: number;
  avgTransaction: number;
}

export interface ParetoByCategoryResult {
  categories: ParetoCategoryPoint[];
  percentage: number;
  topCategory: string;
  topCategorySpend: number;
}

export const findParetoByCategory = (transactions: Transaction[]): ParetoByCategoryResult => {
  const categoryData = new Map<string, { total: number; count: number }>();

  transactions.forEach(t => {
    const category = t.category || 'Uncategorized';
    const existing = categoryData.get(category) || { total: 0, count: 0 };
    categoryData.set(category, {
      total: existing.total + t.amount,
      count: existing.count + 1
    });
  });

  const sorted = Array.from(categoryData.entries())
    .map(([name, data]) => ({ 
      name, 
      total: data.total,
      transactionCount: data.count,
      avgTransaction: data.total / data.count
    }))
    .sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return { 
      categories: [], 
      percentage: 0,
      topCategory: '',
      topCategorySpend: 0
    };
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
      transactionCount: sorted[count].transactionCount,
      avgTransaction: sorted[count].avgTransaction
    });
    count++;
  }

  return {
    categories: topCategories,
    percentage: (count / sorted.length) * 100,
    topCategory: sorted[0]?.name || '',
    topCategorySpend: sorted[0]?.total || 0
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
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  insight: string;
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

  // Determine severity
  let severity: 'low' | 'moderate' | 'high' | 'extreme';
  if (inflationRate < 5) severity = 'low';
  else if (inflationRate < 15) severity = 'moderate';
  else if (inflationRate < 30) severity = 'high';
  else severity = 'extreme';

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

  // Generate insight based on severity and top driver
  let insight = '';
  const topDriver = sortedChanges[0];
  
  if (severity === 'low' || inflationRate < 0) {
    insight = `Your spending is ${inflationRate < 0 ? 'decreasing' : 'stable'}. You're maintaining good financial discipline.`;
  } else if (severity === 'moderate') {
    insight = `Your spending has increased ${Math.round(inflationRate)}%, primarily driven by ${topDriver[0]} (+${Math.round(topDriver[1])}%). This is worth monitoring.`;
  } else if (severity === 'high') {
    insight = `Warning: Your spending has increased ${Math.round(inflationRate)}%. ${topDriver[0]} spending is up ${Math.round(topDriver[1])}%. Consider reviewing your budget.`;
  } else {
    insight = `Alert: Your spending has increased ${Math.round(inflationRate)}%! This is significant lifestyle inflation. ${topDriver[0]} has increased ${Math.round(topDriver[1])}%.`;
  }

  return {
    inflationRate,
    earlyAvg,
    recentAvg,
    monthlyIncrease: recentAvg - earlyAvg,
    annualImpact: (recentAvg - earlyAvg) * 12,
    topIncreases: sortedChanges,
    trend,
    severity,
    insight
  };
};

// NEW: Calculate spending by day of week
export interface DayOfWeekPattern {
  day: string;
  dayNumber: number;
  totalSpend: number;
  avgSpend: number;
  transactionCount: number;
}

export const analyzeSpendingByDayOfWeek = (transactions: Transaction[]): DayOfWeekPattern[] => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayData = new Map<number, { total: number; count: number }>();

  transactions.forEach(t => {
    const dayNum = new Date(t.date).getDay();
    const existing = dayData.get(dayNum) || { total: 0, count: 0 };
    dayData.set(dayNum, {
      total: existing.total + t.amount,
      count: existing.count + 1
    });
  });

  return days.map((day, idx) => {
    const data = dayData.get(idx) || { total: 0, count: 0 };
    return {
      day,
      dayNumber: idx,
      totalSpend: data.total,
      avgSpend: data.count > 0 ? data.total / data.count : 0,
      transactionCount: data.count
    };
  });
};

// NEW: Find subscription-like recurring charges
export interface RecurringCharge {
  merchantName: string;
  amount: number;
  frequency: number; // occurrences
  dates: string[];
  isLikelySubscription: boolean;
  estimatedMonthly: number;
}

export const detectRecurringCharges = (transactions: Transaction[]): RecurringCharge[] => {
  const merchantPatterns = new Map<string, Map<number, string[]>>();

  transactions.forEach(t => {
    const merchant = t.merchantName || t.description;
    const roundedAmount = Math.round(t.amount * 100) / 100;
    
    if (!merchantPatterns.has(merchant)) {
      merchantPatterns.set(merchant, new Map());
    }
    
    const amounts = merchantPatterns.get(merchant)!;
    if (!amounts.has(roundedAmount)) {
      amounts.set(roundedAmount, []);
    }
    amounts.get(roundedAmount)!.push(t.date);
  });

  const recurring: RecurringCharge[] = [];

  merchantPatterns.forEach((amounts, merchant) => {
    amounts.forEach((dates, amount) => {
      if (dates.length >= 2) {
        // Check if dates are roughly monthly
        const sortedDates = dates.sort();
        const intervals: number[] = [];
        
        for (let i = 1; i < sortedDates.length; i++) {
          const diff = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i-1]).getTime()) / (1000 * 60 * 60 * 24);
          intervals.push(diff);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const isMonthly = avgInterval >= 20 && avgInterval <= 35;
        const isWeekly = avgInterval >= 5 && avgInterval <= 10;
        
        if (isMonthly || isWeekly || dates.length >= 3) {
          recurring.push({
            merchantName: merchant,
            amount,
            frequency: dates.length,
            dates: sortedDates,
            isLikelySubscription: isMonthly || (isWeekly && dates.length >= 4),
            estimatedMonthly: isWeekly ? amount * 4.33 : amount
          });
        }
      }
    });
  });

  return recurring.sort((a, b) => b.estimatedMonthly - a.estimatedMonthly);
};

// NEW: Calculate "financial health score" (0-100)
export interface FinancialHealthScore {
  score: number;
  breakdown: {
    essentialsRatio: number; // 30 points
    savingsRate: number; // 30 points  
    consistency: number; // 20 points
    habitControl: number; // 20 points
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  insight: string;
}

export const calculateFinancialHealthScore = (
  transactions: Transaction[],
  habitResults: HabitTaxResult[]
): FinancialHealthScore => {
  const essentialCategories = ['Housing', 'Bills & Utilities', 'Transport'];
  
  const spending = transactions.filter(t => !t.isIncome && !t.isInternalTransfer);
  const income = transactions.filter(t => t.isIncome && !t.isInternalTransfer);
  
  const totalSpend = spending.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const essentialSpend = spending
    .filter(t => essentialCategories.includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  
  // 1. Essentials Ratio (30 points) - Should be <50% of spending
  const essentialsRatio = totalSpend > 0 ? (essentialSpend / totalSpend) * 100 : 0;
  const essentialsScore = essentialsRatio < 50 ? 30 : Math.max(0, 30 - (essentialsRatio - 50));
  
  // 2. Savings Rate (30 points) - (Income - Spending) / Income
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpend) / totalIncome) * 100 : 0;
  const savingsScore = Math.min(30, Math.max(0, savingsRate * 1.5)); // 20% savings = 30 points
  
  // 3. Consistency (20 points) - Low variance in daily spending
  const dailyTotals = new Map<string, number>();
  spending.forEach(t => {
    dailyTotals.set(t.date, (dailyTotals.get(t.date) || 0) + t.amount);
  });
  const amounts = Array.from(dailyTotals.values());
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? (stdDev / avg) * 100 : 100;
  const consistencyScore = Math.max(0, 20 - cv / 5); // Lower CV = better
  
  // 4. Habit Control (20 points) - Low habit spending
  const totalHabitSpend = habitResults.reduce((sum, h) => sum + h.annualSpend, 0) / 12;
  const habitRatio = totalSpend > 0 ? (totalHabitSpend / totalSpend) * 100 : 0;
  const habitScore = Math.max(0, 20 - habitRatio); // <20% = full points
  
  const totalScore = Math.round(essentialsScore + savingsScore + consistencyScore + habitScore);
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (totalScore >= 90) grade = 'A';
  else if (totalScore >= 80) grade = 'B';
  else if (totalScore >= 70) grade = 'C';
  else if (totalScore >= 60) grade = 'D';
  else grade = 'F';
  
  let insight = '';
  if (grade === 'A') insight = 'Excellent financial health! You\'re crushing it.';
  else if (grade === 'B') insight = 'Strong financial position with room for improvement.';
  else if (grade === 'C') insight = 'Decent foundation, but some areas need attention.';
  else if (grade === 'D') insight = 'Financial habits need work. Focus on essentials and savings.';
  else insight = 'Time for a financial reset. Let\'s build better habits together.';
  
  return {
    score: totalScore,
    breakdown: {
      essentialsRatio: Math.round(essentialsScore),
      savingsRate: Math.round(savingsScore),
      consistency: Math.round(consistencyScore),
      habitControl: Math.round(habitScore)
    },
    grade,
    insight
  };
};

// NEW: Detect "regrettable" spending patterns
export interface RegrettableSpending {
  lateNight: { count: number; total: number; transactions: Transaction[] };
  rapidFire: { count: number; total: number; transactions: Transaction[] };
  weekendBinge: { count: number; total: number; transactions: Transaction[] };
  totalRegrettable: number;
  potentialSavings: number;
}

export const detectRegrettableSpending = (transactions: Transaction[]): RegrettableSpending => {
  const spending = transactions.filter(t => !t.isIncome && !t.isInternalTransfer);
  
  // Late night purchases (if we can detect time in description)
  const lateNightTx = spending.filter(t => {
    const desc = t.description.toLowerCase();
    // Look for time stamps like "11:45 PM", "23:45", etc.
    return /\b(1[1-2]|2[0-3]):[0-5][0-9]\s*(pm|p\.m\.)?\b/i.test(desc) ||
           /\b(11|12):[0-5][0-9]\b/i.test(desc);
  });
  
  // Rapid-fire purchases (multiple transactions within 1 hour)
  const rapidTx: Transaction[] = [];
  const sortedTx = [...spending].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    // Try to extract time if available
    return 0;
  });
  
  for (let i = 1; i < sortedTx.length; i++) {
    const prev = sortedTx[i - 1];
    const curr = sortedTx[i];
    
    // Same day and similar categories suggest impulse buying
    if (prev.date === curr.date && 
        prev.category === curr.category &&
        prev.merchantName !== curr.merchantName) {
      if (!rapidTx.includes(prev)) rapidTx.push(prev);
      if (!rapidTx.includes(curr)) rapidTx.push(curr);
    }
  }
  
  // Weekend + dining/bar pattern
  const weekendBingeTx = spending.filter(t => {
    const day = new Date(t.date).getDay();
    const isWeekend = day === 0 || day === 5 || day === 6;
    const isDiningOrBar = t.category === 'Food & Drink' || 
                          t.description.toLowerCase().includes('bar') ||
                          t.description.toLowerCase().includes('brewery') ||
                          t.description.toLowerCase().includes('wine') ||
                          t.description.toLowerCase().includes('liquor');
    return isWeekend && isDiningOrBar && t.amount > 50;
  });
  
  const lateNightTotal = lateNightTx.reduce((sum, t) => sum + t.amount, 0);
  const rapidTotal = rapidTx.reduce((sum, t) => sum + t.amount, 0);
  const weekendTotal = weekendBingeTx.reduce((sum, t) => sum + t.amount, 0);
  
  // Avoid double-counting
  const uniqueRegrettable = new Set([...lateNightTx, ...rapidTx, ...weekendBingeTx]);
  const totalRegrettable = Array.from(uniqueRegrettable).reduce((sum, t) => sum + t.amount, 0);
  
  // Estimate 30% of regrettable spending could be saved
  const potentialSavings = totalRegrettable * 0.3;
  
  return {
    lateNight: { count: lateNightTx.length, total: lateNightTotal, transactions: lateNightTx },
    rapidFire: { count: rapidTx.length, total: rapidTotal, transactions: rapidTx },
    weekendBinge: { count: weekendBingeTx.length, total: weekendTotal, transactions: weekendBingeTx },
    totalRegrettable,
    potentialSavings
  };
};

// NEW: Find user's "best month" financially
export interface BestMonth {
  month: string;
  totalSpend: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  whyBest: string;
}

export const findBestMonth = (transactions: Transaction[]): BestMonth | null => {
  const monthlyData = new Map<string, { spend: number; income: number }>();
  
  transactions.forEach(t => {
    const monthKey = t.date.substring(0, 7);
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { spend: 0, income: 0 });
    }
    
    const data = monthlyData.get(monthKey)!;
    if (t.isIncome && !t.isInternalTransfer) {
      data.income += t.amount;
    } else if (!t.isIncome && !t.isInternalTransfer) {
      data.spend += t.amount;
    }
  });
  
  if (monthlyData.size === 0) return null;
  
  const monthsWithSavings = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      totalSpend: data.spend,
      totalIncome: data.income,
      netSavings: data.income - data.spend,
      savingsRate: data.income > 0 ? ((data.income - data.spend) / data.income) * 100 : 0
    }))
    .filter(m => m.totalIncome > 0)
    .sort((a, b) => b.savingsRate - a.savingsRate);
  
  if (monthsWithSavings.length === 0) return null;
  
  const best = monthsWithSavings[0];
  
  let whyBest = '';
  if (best.savingsRate > 30) {
    whyBest = 'You showed incredible discipline with a 30%+ savings rate.';
  } else if (best.savingsRate > 20) {
    whyBest = 'Strong financial control with healthy savings.';
  } else if (best.savingsRate > 10) {
    whyBest = 'Decent savings rate while managing expenses.';
  } else {
    whyBest = 'Your most balanced month of income and expenses.';
  }
  
  return { ...best, whyBest };
};

// NEW: Calculate opportunity cost
export interface OpportunityCostResult {
  monthlySavings: number;
  annualSavings: number;
  fiveYearValue: number;
  tenYearValue: number;
  alternatives: Array<{
    description: string;
    value: string;
    emoji: string;
  }>;
}

export const calculateOpportunityCost = (
  savedAmount: number,
  timeframe: 'monthly' | 'annual' = 'monthly'
): OpportunityCostResult => {
  const monthly = timeframe === 'monthly' ? savedAmount : savedAmount / 12;
  const annual = monthly * 12;
  
  const fiveYearValue = calculateFutureValue(annual, 0.05, 5);
  const tenYearValue = calculateFutureValue(annual, 0.07, 10);
  
  const alternatives = [];
  
  if (annual >= 1200) {
    alternatives.push({
      description: 'Nice vacation every year',
      value: `${Math.floor(annual / 1200)} trips`,
      emoji: '✈️'
    });
  }
  
  if (annual >= 500) {
    alternatives.push({
      description: 'Weekend getaways',
      value: `${Math.floor(annual / 500)} trips`,
      emoji: '🏖️'
    });
  }
  
  if (tenYearValue >= 15000) {
    alternatives.push({
      description: 'Down payment on a car',
      value: `${Math.round(tenYearValue).toLocaleString()} in 10 years`,
      emoji: '🚗'
    });
  }
  
  if (fiveYearValue >= 5000) {
    alternatives.push({
      description: 'Emergency fund cushion',
      value: `${Math.round(fiveYearValue).toLocaleString()} in 5 years`,
      emoji: '🛡️'
    });
  }
  
  alternatives.push({
    description: 'Investment growth potential',
    value: `${Math.round(tenYearValue).toLocaleString()} in 10 years at 7%`,
    emoji: '📈'
  });
  
  return {
    monthlySavings: monthly,
    annualSavings: annual,
    fiveYearValue,
    tenYearValue,
    alternatives
  };
};