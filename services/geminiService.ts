
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategorizationResult, SpendingInsight, BudgetSuggestion } from "../types";

const sanitizeDescription = (desc: string): string => {
  return desc.replace(/\b\d{4,}\b/g, '****').replace(/\s\s+/g, ' ').trim();
};

export const categorizeTransactions = async (transactions: Transaction[]): Promise<CategorizationResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    desc: desc
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
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                merchant: { type: Type.STRING },
                category: { type: Type.STRING },
                subCategory: { type: Type.STRING }
              },
              required: ["id", "merchant", "category", "subCategory"]
            }
          }
        }
      });

      const chunkResults = JSON.parse(response.text || '[]');
      
      chunkResults.forEach((res: any) => {
        const originalDesc = chunk.find(c => c.id === res.id)?.desc;
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
      console.error("Gemini Error:", e);
    }
  }

  return results;
};

export const getSpendingInsights = async (transactions: Transaction[]): Promise<SpendingInsight[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["positive", "warning", "info", "milestone"] },
              icon: { type: Type.STRING },
              color: { type: Type.STRING }
            },
            required: ["title", "description", "type", "icon", "color"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const suggestBudgets = async (transactions: Transaction[]): Promise<BudgetSuggestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const realSpend = transactions.filter(t => t.category !== 'Account Transfer' && !t.isIncome);
  
  // Group by category to find average monthly volumes
  const catSummary: Record<string, number> = {};
  realSpend.forEach(t => {
    catSummary[t.category] = (catSummary[t.category] || 0) + t.amount;
  });

  const prompt = `You are a financial advisor. Review these spending categories and their total transaction history. 
  Suggest monthly budgets for the top spending categories. 
  Identify potential areas to trim or save.
  Data: ${JSON.stringify(catSummary)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              suggestedLimit: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              potentialSavings: { type: Type.NUMBER }
            },
            required: ["category", "suggestedLimit", "reason", "potentialSavings"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const queryTransactions = async (query: string, transactions: Transaction[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = transactions.slice(0, 200).map(t => `${t.date}: ${t.merchantName || t.description} ($${t.amount}) [${t.category}]`).join('\n');

  const prompt = `You are "The Teller", a wise and friendly bank teller from a golden era of banking.
  "What can your money tell you?" is your guiding thought.
  Answer questions about the spending patterns. If you see transfers, explain they are excluded from spending totals.
  
  Data context:
  ${summary}
  
  Question: ${query}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "The vault is quiet on that matter, I'm afraid.";
  } catch (e) {
    return "I'm having a spot of trouble with the records.";
  }
};
