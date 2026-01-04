import type { Context, Config } from "@netlify/functions";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  isIncome: boolean;
  date: string;
}

interface SpendingInsight {
  category: string;
  amount: number;
  trend: string;
  advice: string;
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

    const prompt = `You are a personal finance analyst. Given these transactions, provide 3-5 concise insights about spending patterns.
Respond only with a JSON array of objects, each with:
- category (spending category name)
- amount (total amount in that category)
- trend (brief trend description, e.g., "increasing", "stable", "seasonal")
- advice (one-sentence actionable advice)

Transactions:
${JSON.stringify(transactions, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const insights = JSON.parse(cleaned) as SpendingInsight[];

    return new Response(JSON.stringify(insights), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Insights error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate insights" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/insights",
};
