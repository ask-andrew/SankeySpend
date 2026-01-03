
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategorizationResult, SpendingInsight } from "../types";

/**
 * Sanitizes transaction descriptions to remove potential PII like account numbers or IDs.
 * Replaces sequences of 4+ digits with asterisks.
 */
const sanitizeDescription = (desc: string): string => {
  return desc.replace(/\b\d{4,}\b/g, '****');
};

export const categorizeTransactions = async (transactions: Transaction[]): Promise<CategorizationResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  // Get unique sanitized descriptions to minimize token usage
  const uniqueMap = new Map<string, string>(); // sanitized -> original
  transactions.forEach(t => {
    const sanitized = sanitizeDescription(t.description.substring(0, 80));
    uniqueMap.set(sanitized, t.description);
  });

  const sanitizedList = Array.from(uniqueMap.keys());
  
  if (sanitizedList.length === 0) return [];

  const prompt = `Categorize these bank transaction descriptions. 
  Rules:
  1. Use high-level categories: Food, Housing, Transport, Shopping, Entertainment, Utilities, Income, Health, Finance, Education, Travel.
  2. Provide a specific sub-category for each.
  3. If it looks like a refund or salary, mark category as 'Income'.
  
  Data: ${JSON.stringify(sanitizedList)}`;

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
            description: { type: Type.STRING, description: "The sanitized description from the input list" },
            category: { type: Type.STRING },
            subCategory: { type: Type.STRING }
          },
          required: ["description", "category", "subCategory"]
        }
      }
    }
  });

  const results = JSON.parse(response.text || '[]');
  
  // Map back to original transactions via description matching
  return transactions.map(t => {
    const currentSanitized = sanitizeDescription(t.description.substring(0, 80));
    const match = results.find((r: any) => r.description === currentSanitized);
    return {
      id: t.id,
      category: match?.category || "Uncategorized",
      subCategory: match?.subCategory || "Other"
    };
  });
};

export const getSpendingInsights = async (transactions: Transaction[]): Promise<SpendingInsight[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  // Sample 100 representative transactions to stay within context limits
  const summary = transactions.slice(0, 100).map(t => ({
    d: sanitizeDescription(t.description.substring(0, 50)),
    a: t.amount,
    c: t.category,
    date: t.date
  }));

  const prompt = `Act as a financial advisor. Analyze this spending data and provide 3 smart insights. 
  Types: 'positive' (saving/good habits), 'warning' (overspending), 'info' (trends).
  Data: ${JSON.stringify(summary)}`;

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

  return JSON.parse(response.text || '[]');
};
