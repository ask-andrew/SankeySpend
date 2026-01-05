import { Transaction, CategorizationResult, SpendingInsight, BudgetSuggestion } from "../types";

const sanitizeDescription = (desc: string): string => {
  return desc.replace(/\b\d{4,}\b/g, '****').replace(/\s\s+/g, ' ').trim();
};

// Helper to call Netlify Functions
const callFunction = async (path: string, body: any): Promise<any> => {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Function error: ${res.status}`);
  }
  return res.json();
};

export const categorizeTransactions = async (transactions: Transaction[]): Promise<CategorizationResult[]> => {
  try {
    const sanitizedToIds = new Map<string, string[]>();
    transactions.forEach(t => {
      const sanitized = sanitizeDescription(t.description.substring(0, 80));
      if (!sanitizedToIds.has(sanitized)) {
        sanitizedToIds.set(sanitized, []);
      }
      sanitizedToIds.get(sanitized)!.push(t.id);
    });

    const sanitizedList = Array.from(sanitizedToIds.keys()).map((desc, index) => ({
      id: index,
      desc
    }));
    
    if (sanitizedList.length === 0) return [];

    const chunkSize = 40;
    const results: CategorizationResult[] = [];

    for (let i = 0; i < sanitizedList.length; i += chunkSize) {
      const chunk = sanitizedList.slice(i, i + chunkSize);
      
      const prompt = `You are a warm financial mentor. Categorize these bank transactions. 
      IMPORTANT: Identify internal transfers, credit card bill payments, and transfers between accounts as "Account Transfer". These should not be treated as spending.
      Available Categories: Food & Drink, Housing, Transport, Shopping, Fun & Hobbies, Bills & Utilities, Income, Wellness & Health, Money & Finance, Education, Travel, Work, Account Transfer, Uncategorized.
      
      Data: ${JSON.stringify(chunk)}`;

      try {
        const response = await callFunction('/api/categorize', { transactions: chunk.map(c => ({ id: c.id.toString(), description: c.desc, amount: 0, category: '', isIncome: false })) });
        const chunkResults = response as any[];
        
        chunkResults.forEach((res: any) => {
          const originalDesc = chunk.find(c => c.id === Number(res.id))?.desc;
          if (originalDesc) {
            const ids = sanitizedToIds.get(originalDesc) || [];
            ids.forEach(id => {
              results.push({
                id,
                merchant: res.merchant || "Unknown",
                category: res.category || "Uncategorized",
                subCategory: res.subCategory || "Other"
              });
            });
          }
        });
      } catch (e) {
        console.error("Categorization function error:", e);
      }
    }

    return results;
  } catch (e) {
    console.error("Categorization error:", e);
    return [];
  }
};

export const getSpendingInsights = async (transactions: Transaction[]): Promise<SpendingInsight[]> => {
  try {
    const realSpend = transactions.filter(t => t.category !== 'Account Transfer' && !t.isIncome);
    const summary = realSpend.slice(0, 50).map(t => ({
      m: t.merchantName || t.description,
      a: t.amount,
      c: t.category,
      d: t.date
    }));

    const prompt = `You are "The Teller". Based on these transactions, generate 6 "Financial Awards" or insights.
    Make them celebratory, funny, or very insightful. 
    Include an icon from FontAwesome 6 (e.g. "fa-coffee", "fa-bolt", "fa-gem").
    Provide a hex color that matches the theme of the award.
    Data: ${JSON.stringify(summary)}`;

    const response = await callFunction('/api/insights', { transactions: realSpend });
    return response as SpendingInsight[];
  } catch (e) {
    console.error("Insights error:", e);
    return [];
  }
};

export const suggestBudgets = async (transactions: Transaction[]): Promise<BudgetSuggestion[]> => {
  try {
    // Filter out income and internal transfers
    const realSpend = transactions.filter(t => !t.isIncome && t.category !== 'Account Transfer' && !t.isInternalTransfer);
    
    if (realSpend.length === 0) return [];
    
    // Calculate monthly spending by category
    const categoryMonthlyTotals = new Map<string, Map<string, number>>();
    
    realSpend.forEach(t => {
      const monthKey = getMonthKey(t.date);
      if (!categoryMonthlyTotals.has(t.category)) {
        categoryMonthlyTotals.set(t.category, new Map());
      }
      const monthMap = categoryMonthlyTotals.get(t.category)!;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + t.amount);
    });
    
    // Calculate averages and create suggestions
    const suggestions: BudgetSuggestion[] = [];
    
    categoryMonthlyTotals.forEach((monthMap, category) => {
      const monthlyTotals = Array.from(monthMap.values());
      const averageMonthly = monthlyTotals.reduce((sum, total) => sum + total, 0) / monthlyTotals.length;
      
      // Add a small buffer (10%) to the average for suggested budget
      const suggestedLimit = Math.round(averageMonthly * 1.1);
      
      suggestions.push({
        category,
        suggestedLimit,
        reason: `Based on your average monthly spending of $${averageMonthly.toFixed(2)} across ${monthlyTotals.length} months`,
        potentialSavings: Math.round(averageMonthly * 0.1) // Potential 10% savings
      });
    });
    
    // Sort by total spending amount (highest first) and limit to top categories
    return suggestions
      .sort((a, b) => b.suggestedLimit - a.suggestedLimit)
      .slice(0, 8); // Top 8 categories
  } catch (e) {
    console.error("Budget suggestions error:", e);
    return [];
  }
};

// Helper function to get month key
const getMonthKey = (date: string): string => {
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  return date.slice(0, 7);
};

export const queryTransactions = async (query: string, transactions: Transaction[]): Promise<string> => {
  try {
    const response = await callFunction('/api/query', { transactions, query });
    return (response as any).answer || "The vault is quiet on that matter, I'm afraid.";
  } catch (e) {
    console.error("Query error:", e);
    return "I'm having a spot of trouble with the records.";
  }
};
