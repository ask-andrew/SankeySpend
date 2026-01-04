import type { Context, Config } from "@netlify/functions";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  isIncome: boolean;
  date: string;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { transactions, query }: { transactions: Transaction[]; query: string } = await req.json();

    if (!Array.isArray(transactions) || typeof query !== "string") {
      return new Response("Invalid request", { status: 400 });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }) as any;
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a personal finance assistant. Answer the user's query based on their transaction history.
Respond naturally and concisely (1-3 sentences). If the query cannot be answered from the data, say "I can't answer that from your transactions."

Query: "${query}"

Transactions:
${JSON.stringify(transactions, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    return new Response(JSON.stringify({ answer: response.trim() }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Query error:", error);
    return new Response(JSON.stringify({ error: "Failed to process query" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/query",
};
