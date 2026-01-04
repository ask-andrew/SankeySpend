import type { Context, Config } from "@netlify/functions";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category?: string;
  isIncome: boolean;
}

interface CategorizationResult {
  id: string;
  category: string;
  merchant?: string;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { transactions }: { transactions: Transaction[] } = await req.json();

    if (!Array.isArray(transactions)) {
      return new Response("Invalid transactions array", { status: 400 });
    }

    // Import GoogleGenAI dynamically to avoid bundling issues
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }) as any;
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a personal finance categorization assistant. Categorize each transaction into one of these exact categories:
- Housing
- Food & Drink
- Transport
- Shopping
- Bills & Utilities
- Wellness & Health
- Travel
- Entertainment
- Account Transfer
- Income
- Uncategorized

Respond only with a JSON array of objects, each with:
- id (the transaction id)
- category (one of the categories above)
- merchant (optional, clean merchant name if detectable)

Transactions:
${JSON.stringify(transactions, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const categorized = JSON.parse(cleaned) as CategorizationResult[];

    return new Response(JSON.stringify(categorized), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Categorization error:", error);
    return new Response(JSON.stringify({ error: "Failed to categorize" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/categorize",
};
