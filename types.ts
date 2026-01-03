
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  subCategory?: string;
  isIncome: boolean;
  source: string; // New field to track the file/account
}

export interface CategorizationResult {
  id: string;
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
