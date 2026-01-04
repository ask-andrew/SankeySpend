
export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchantName?: string;
  amount: number;
  category: string;
  subCategory?: string;
  isIncome: boolean;
  source: string;
  linkedToId?: string;
  isInternalTransfer?: boolean;
}

export interface CategoryBudget {
  category: string;
  limit: number;
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
  type: 'positive' | 'warning' | 'info' | 'milestone';
  value?: string;
}

export interface SankeyData {
  nodes: { name: string; id: string; color?: string }[];
  links: { source: number; target: number; value: number }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  isInitial?: boolean;
}

export interface FinancialFingerprint {
  impulsivity: number;
  weekendEffect: number;
  essentialRatio: number;
  merchantLoyalty: number;
  digitalDependency: number;
}
