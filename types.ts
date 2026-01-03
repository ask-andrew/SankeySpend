
export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchantName?: string; // AI-cleaned vendor name
  amount: number;
  category: string;
  subCategory?: string;
  isIncome: boolean;
  source: string;
}

export interface CategorizationResult {
  id: string;
  merchant: string;
  category: string;
  subCategory: string;
}

export interface SpendingInsight {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'info';
}

export interface SankeyData {
  nodes: { name: string; id: string; color?: string }[];
  links: { source: number; target: number; value: number }[];
}
