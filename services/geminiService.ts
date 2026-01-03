
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategorizationResult, SpendingInsight } from "../types";

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

  const chunkSize = 50;
  const results: CategorizationResult[] = [];

  for (let i = 0; i < sanitizedList.length; i += chunkSize) {
    const chunk = sanitizedList.slice(i, i + chunkSize);
    
    const prompt = `You are a friendly personal finance mentor. Categorize these transactions into easy-to-understand groups.
    Identify credit card payments as "Account Transfer".
    Categories: Food & Drink, Housing, Transport, Shopping, Fun & Hobbies, Bills & Utilities, Income, Wellness & Health, Money & Finance, Education, Travel, Work, Account Transfer, Uncategorized.
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

export const queryTransactions = async (query: string, transactions: Transaction[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = transactions.map(t => `${t.date}: ${t.merchantName || t.description} ($${t.amount}) [${t.category}] ${t.isInternalTransfer ? '(Transfer)' : ''}`).join('\n');

  const prompt = `You are "The Teller", a warm, encouraging, and highly intelligent personal finance mentor. 
  Answer the user's question about their spending history. Be conversational but accurate.
  When they ask for "Real Spending", ignore internal transfers between accounts.
  
  Transactions:
  ${summary}
  
  Question: ${query}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "I'm sorry, I couldn't quite find the answer to that in your history.";
  } catch (e) {
    return "I'm having a bit of trouble connecting to your records right now.";
  }
};

export const getSpendingInsights = async (transactions: Transaction[]): Promise<SpendingInsight[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const nonInternal = transactions.filter(t => !t.isInternalTransfer);
  const summary = nonInternal.slice(0, 100).map(t => ({
    m: t.merchantName,
    a: t.amount,
    c: t.category,
    inc: t.isIncome
  }));

  const prompt = `You are The Teller. Provide 4 friendly spending insights. 
  Focus on "Real Spending" (actual expenses, not transfers).
  Use encouraging language. One should be a celebration milestone.
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
              type: { type: Type.STRING, enum: ["positive", "warning", "info", "milestone"] }
            },
            required: ["title", "description", "type"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};
