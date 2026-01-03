
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategorizationResult, SpendingInsight } from "../types";

const sanitizeDescription = (desc: string): string => {
  return desc.replace(/\b\d{4,}\b/g, '****').replace(/\s\s+/g, ' ').trim();
};

export const categorizeTransactions = async (transactions: Transaction[]): Promise<CategorizationResult[]> => {
  // Fix: Strict initialization according to guidelines
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
    
    const prompt = `Categorize these merchant descriptions and extract a CLEAN merchant name (e.g., 'Amazon' instead of 'AMZN MKTP US*123').
    If description is just a date or junk, use 'Uncategorized'.
    Categories: Food, Housing, Transport, Shopping, Entertainment, Utilities, Income, Health, Finance, Education, Travel, Business, Uncategorized.
    
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
                merchant: { type: Type.STRING, description: "Clean vendor name" },
                category: { type: Type.STRING },
                subCategory: { type: Type.STRING }
              },
              required: ["id", "merchant", "category", "subCategory"]
            }
          }
        }
      });

      // Fix: Direct property access for text
      const chunkResults = JSON.parse(response.text || '[]');
      
      chunkResults.forEach((res: any) => {
        const originalDesc = chunk.find(c => c.id === res.id)?.desc;
        if (originalDesc) {
          const ids = sanitizedToIds.get(originalDesc) || [];
          ids.forEach(id => {
            results.push({
              id,
              merchant: res.merchant || "Unknown Vendor",
              category: res.category || "Uncategorized",
              subCategory: res.subCategory || "Other"
            });
          });
        }
      });
    } catch (e) {
      console.error("Gemini Categorization Error:", e);
    }
  }

  return results;
};

export const getSpendingInsights = async (transactions: Transaction[]): Promise<SpendingInsight[]> => {
  // Fix: Strict initialization according to guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = transactions.slice(0, 100).map(t => ({
    m: t.merchantName,
    a: t.amount,
    c: t.category,
    isIncome: t.isIncome
  }));

  const prompt = `Analyze these transactions and provide 3 financial insights. Focus on trends and merchant density.
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
              type: { type: Type.STRING, enum: ["positive", "warning", "info"] }
            },
            required: ["title", "description", "type"]
          }
        }
      }
    });
    // Fix: Direct property access for text
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};
