import type { Context, Config } from "@netlify/functions";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  isIncome: boolean;
  date: string;
}

interface BudgetSuggestion {
  category: string;
  suggestedLimit: number;
  reason: string;
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

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }) as any;
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a budgeting advisor. Given these transactions, suggest reasonable monthly budget limits for the top spending categories.
Respond only with a JSON array of objects, each with:
- category (exact category name)
- suggestedLimit (monthly limit as a number)
- reason (one-sentence justification)

Transactions:
${JSON.stringify(transactions, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const suggestions = JSON.parse(cleaned) as BudgetSuggestion[];

    return new Response(JSON.stringify(suggestions), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Budget suggestions error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate budget suggestions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/suggest-budgets",
};
