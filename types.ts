
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
  linkedToId?: string; // ID of the matching payment/transfer
  isInternalTransfer?: boolean;
}

export interface TransactionLink {
  id: string;
  transactionId1: string; // Payment from checking
  transactionId2: string; // Payment to credit card
  linkType: 'credit_card_payment' | 'transfer' | 'manual';
  amount: number;
  confidence: number; // 0-100
  userConfirmed: boolean;
  dateLinked: string;
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
