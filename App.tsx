
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, SpendingInsight, SankeyData, ChatMessage, BudgetSuggestion } from './types';
import { categorizeTransactions, getSpendingInsights, queryTransactions, suggestBudgets } from './services/geminiService';
import CategorizationLearner from './services/categorizationLearner';
import { guessCategoryFromDescription } from './utils/categorizationUtils';
import SankeyChart from './components/SankeyChart';
import SmartCategorizationSuggestions from './components/SmartCategorizationSuggestions';
import Papa from 'papaparse';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import HabitTaxCalculator from './components/insights/HabitTaxCalculator';
import ParetoAnalysis from './components/insights/ParetoAnalysis';
import LifestyleInflationDetector from './components/insights/LifestyleInflationDetector';
import CashFlowWaterfall from './components/insights/CashFlowWaterfall';
import FinancialFingerprintInsight from './components/insights/FinancialFingerprint';

export const COLORS = [
  '#1e40af', // Deep Blue
  '#dc2626', // Bright Red  
  '#16a34a', // Emerald Green
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#eab308', // Yellow
  '#be185d', // Pink
  '#059669', // Teal
  '#7c3aed', // Violet
  '#ca8a04', // Amber
  '#0f766e'  // Dark Teal
];
const TELLER_ILLUSTRATION = "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop";

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Drink": "fa-utensils",
  "Housing": "fa-landmark",
  "Transport": "fa-train",
  "Shopping": "fa-basket-shopping",
  "Fun & Hobbies": "fa-chess-knight",
  "Bills & Utilities": "fa-lightbulb",
  "Income": "fa-sack-dollar",
  "Wellness & Health": "fa-heart-pulse",
  "Money & Finance": "fa-vault",
  "Education": "fa-book-open",
  "Travel": "fa-passport",
  "Work": "fa-briefcase",
  "Account Transfer": "fa-shuffle",
  "Uncategorized": "fa-circle-question"
};

const getMonthKey = (rawDate: string | undefined): string => {
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  // Fallback to first 7 chars (works reasonably for ISO-like strings)
  return rawDate.slice(0, 7);
};

const formatMonthLabel = (monthKey: string): string => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const y = Number(year);
  const m = Number(month);
  if (!isNaN(y) && !isNaN(m)) {
    const d = new Date(y, m - 1, 1);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
  }
  return monthKey;
};

const Logo: React.FC<{ showTagline?: boolean; size?: 'sm' | 'md' | 'lg', isLight?: boolean }> = ({ showTagline = true, size = 'md', isLight = false }) => {
  const scale = size === 'sm' ? 0.6 : size === 'lg' ? 1.5 : 1;
  const titleColor = isLight ? 'text-[#c5a059]' : 'text-[#062c1a]';
  const tagColor = isLight ? 'text-amber-100/60' : 'text-amber-900/60';

  return (
    <div className="flex items-center gap-4">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'left center' }} className="shrink-0 drop-shadow-lg">
        <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="50" r="3" fill="#c5a059" />
          <path d="M10 50H20" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" />
          <circle cx="15" cy="58" r="3" fill="#062c1a" stroke="#c5a059" strokeWidth="2" />
          <path d="M15 58H20" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="66" r="3" fill="#c5a059" />
          <path d="M10 66H20" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" />
          <rect x="22" y="45" width="60" height="45" rx="6" fill="#2d1810" />
          <rect x="26" y="49" width="52" height="37" rx="3" fill="#3d251a" />
          <path d="M37 45V35C37 26.7157 43.7157 20 52 20C60.2843 20 67 26.7157 67 35V45" stroke="#c5a059" strokeWidth="8" strokeLinecap="round" />
          <rect x="38" y="72" width="5" height="10" rx="1" fill="#c5a059" opacity="0.4" />
          <rect x="48" y="67" width="5" height="15" rx="1" fill="#c5a059" opacity="0.6" />
          <rect x="58" y="62" width="5" height="20" rx="1" fill="#c5a059" />
          <path d="M28 65L42 60L52 70L72 52" stroke="#c5a059" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M66 52H72V58" stroke="#c5a059" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex flex-col">
        <h1 className={`font-black tracking-tight leading-none logo-text serif ${size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-5xl' : 'text-3xl'} ${titleColor}`}>Teller</h1>
        {showTagline && <span className={`font-medium tracking-tight serif ${size === 'lg' ? 'text-lg mt-1' : 'text-[10px] md:text-[12px]'} ${tagColor}`}>Your Money's Story. Privately Told.</span>}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const categorizationLearner = useMemo(() => new CategorizationLearner(), []);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('teller_txs');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('teller_budgets');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'assistant' | 'budgets' | 'insights' | 'about'>('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', content: "Welcome back to the Teller's desk. What story shall we uncover today? Your privacy is sealed behind this counter.", isInitial: true }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(() => localStorage.getItem('teller_ai_enabled') !== 'false');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('teller_txs', JSON.stringify(transactions));
    if (transactions.length > 0 && insights.length === 0) refreshInsights();
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('teller_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('teller_ai_enabled', JSON.stringify(aiEnabled));
  }, [aiEnabled]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const refreshInsights = async () => {
    if (aiEnabled) {
      const newInsights = await getSpendingInsights(transactions);
      setInsights(newInsights);
    } else {
      setInsights([]);
    }
  };

  const handleDemoData = () => {
    const today = new Date();
    const demo: Transaction[] = [
      { id: 'd1', date: '2024-01-01', description: 'Monthly Salary', amount: 5000, category: 'Income', isIncome: true, source: 'Payroll' },
      { id: 'd2', date: '2024-01-02', description: 'Rent Payment', amount: 2000, category: 'Housing', isIncome: false, source: 'Checking' },
      { id: 'd3', date: '2024-01-03', description: 'Starbucks Coffee', amount: 6.50, category: 'Food & Drink', isIncome: false, source: 'Credit Card' },
      { id: 'd4', date: '2024-01-05', description: 'Uber Trip', amount: 24.00, category: 'Transport', isIncome: false, source: 'Credit Card' },
      { id: 'd5', date: '2024-01-07', description: 'Grocery Store', amount: 156.40, category: 'Food & Drink', isIncome: false, source: 'Checking' },
      { id: 'd6', date: '2024-01-10', description: 'Amazon Order', amount: 89.99, category: 'Shopping', isIncome: false, source: 'Credit Card' },
      { id: 'd7', date: '2024-01-15', description: 'Electric Bill', amount: 120.00, category: 'Bills & Utilities', isIncome: false, source: 'Checking' },
      { id: 'd11', date: '2024-01-28', description: 'Payment to AMEX', amount: 1200, category: 'Account Transfer', isIncome: false, source: 'Checking' },
      { id: 'd12', date: '2024-01-28', description: 'CC Payment Received', amount: 1200, category: 'Account Transfer', isIncome: true, source: 'Credit Card' }
    ];
    setTransactions(demo);
    setBudgets({ 'Food & Drink': 500, 'Shopping': 300, 'Transport': 200 });
    setActiveTab('home');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if it's a JSON backup file
    if (files[0].name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target?.result as string);
          if (backup.transactions && backup.budgets) {
            setTransactions(backup.transactions);
            setBudgets(backup.budgets);
            alert("Vault backup restored successfully.");
          }
        } catch (err) { alert("Failed to restore backup."); }
      };
      reader.readAsText(files[0]);
      return;
    }

    setIsProcessing(true);
    try {
      let allNewTransactions: Transaction[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsed: Transaction[] = await new Promise((res) => {
          Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: (results) => {
              const headers = results.meta.fields || [];
              const dateH = headers.find(h => /date/i.test(h));
              const descH = headers.find(h => /desc|memo|payee|merchant/i.test(h));
              const amtH = headers.find(h => /amount|total|value/i.test(h));
              const catH = headers.find(h => /category/i.test(h));
              if (!dateH || !amtH) return res([]);
              res((results.data as any[]).map((row, idx) => ({
                id: `${file.name}-${idx}-${Date.now()}`,
                date: row[dateH],
                description: row[descH!] || 'Activity',
                amount: Math.abs(parseFloat(row[amtH].toString().replace(/[$,]/g, '')) || 0),
                category: catH && row[catH] ? String(row[catH]) : 'Categorizing...',
                isIncome: parseFloat(row[amtH].toString().replace(/[$,]/g, '')) > 0,
                source: file.name
              })));
            }
          });
        });
        allNewTransactions = [...allNewTransactions, ...parsed];
      }
      const toCategorize = allNewTransactions.filter(t => !t.category || t.category === 'Categorizing...' || t.category === 'Uncategorized');
      const cats = aiEnabled ? await categorizeTransactions(toCategorize) : [];
      const enriched = allNewTransactions.map(t => {
        const match = cats.find(c => c.id === t.id);
        let category = t.category;
        
        if (!category || category === 'Categorizing...' || category === 'Uncategorized') {
          // Try learned patterns first
          const learnedSuggestion = categorizationLearner.suggestCategory(t.description, t.merchantName);
          
          if (learnedSuggestion && learnedSuggestion.confidence > 0.7) {
            category = learnedSuggestion.category;
          } else {
            // Fall back to AI categorization, then pattern matching, then default
            category = match?.category || guessCategoryFromDescription(t.description) || 'Uncategorized';
          }
        }
        
        // Learn from the final categorization
        categorizationLearner.learnFromTransaction(t.description, match?.merchant || t.merchantName, category);
        
        return { 
          ...t, 
          merchantName: match?.merchant || t.merchantName, 
          category: category,
          isInternalTransfer: category === 'Account Transfer'
        };
      });

      // NEW: Smart pairing for internal transfers across all transactions (existing + new)
      const allTransactionsForPairing = [...transactions, ...enriched];
      const potentialTransfers = new Map<number, Transaction[]>(); // amount -> transactions

      allTransactionsForPairing.forEach(t => {
        if (t.category !== 'Account Transfer') { // Only consider non-transfers for pairing
          const absAmount = Math.abs(t.amount);
          if (!potentialTransfers.has(absAmount)) {
            potentialTransfers.set(absAmount, []);
          }
          potentialTransfers.get(absAmount)!.push(t);
        }
      });

      potentialTransfers.forEach(txs => {
        if (txs.length >= 2) {
          // Sort by date to find close pairs
          txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          for (let i = 0; i < txs.length - 1; i++) {
            const tx1 = txs[i];
            const tx2 = txs[i + 1];

            // Check if they are income/expense pair of same amount, close in date, and have transfer-like keywords
            const desc1 = (tx1.description || tx1.merchantName || '').toLowerCase();
            const desc2 = (tx2.description || tx2.merchantName || '').toLowerCase();
            const hasTransferKeywords = desc1.includes('transfer') || desc1.includes('payment') || desc1.includes('move') ||
                                     desc2.includes('transfer') || desc2.includes('payment') || desc2.includes('move');
            
            if (tx1.isIncome !== tx2.isIncome &&
                Math.abs(tx1.amount) === Math.abs(tx2.amount) &&
                Math.abs(new Date(tx1.date).getTime() - new Date(tx2.date).getTime()) < (1000 * 60 * 60 * 24 * 3) && // within 3 days
                hasTransferKeywords) {
              // Mark both as internal transfers
              tx1.category = 'Account Transfer';
              tx1.isInternalTransfer = true;
              tx2.category = 'Account Transfer';
              tx2.isInternalTransfer = true;
            }
          }
        }
      });

      setTransactions([...transactions, ...enriched]);
      await refreshInsights();
    } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  };

  const handleExportData = () => {
    const data = JSON.stringify({ transactions, budgets }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teller-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveCategoryEdit = (txId: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        const updated = { ...t, category: editCategory, isInternalTransfer: editCategory === 'Account Transfer' };
        // Learn from manual categorization
        categorizationLearner.learnFromTransaction(t.description, t.merchantName, editCategory);
        return updated;
      }
      return t;
    }));
    setEditingTransactionId(null);
    setEditCategory('');
    refreshInsights();
  };

  const handleBulkCategorize = (transactionIds: string[], category: string) => {
    setTransactions(prev => prev.map(t => {
      if (transactionIds.includes(t.id)) {
        const updated = { ...t, category, isInternalTransfer: category === 'Account Transfer' };
        // Learn from bulk categorization
        categorizationLearner.learnFromTransaction(t.description, t.merchantName, category);
        return updated;
      }
      return t;
    }));
    refreshInsights();
  };

  const filteredTransactions = useMemo(() => {
    const base = transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (t.merchantName?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesMonth = filterMonth === 'all' || getMonthKey(t.date) === filterMonth;
      return matchesSearch && matchesCategory && matchesMonth;
    });

    // Ensure spending views are grouped / ordered by month and then by date (newest first)
    return base.slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchTerm, selectedCategory, filterMonth]);

  const categoriesAvailable = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const spendingCategories = useMemo(() => {
    return categoriesAvailable.filter(c => c !== 'Income' && c !== 'Account Transfer' && c !== 'Categorizing...');
  }, [categoriesAvailable]);

  const totals = useMemo(() => {
    const realSpend = filteredTransactions.filter(t => !t.isIncome && t.category !== 'Account Transfer' && !t.isInternalTransfer).reduce((s, t) => s + t.amount, 0);
    const moneyIn = filteredTransactions.filter(t => t.isIncome && t.category !== 'Account Transfer' && !t.isInternalTransfer).reduce((s, t) => s + t.amount, 0);
    return { realSpend, moneyIn, net: moneyIn - realSpend };
  }, [filteredTransactions]);

  const months = useMemo(() => {
    const mSet = new Set<string>();
    transactions.forEach(t => {
      const key = getMonthKey(t.date);
      if (key) mSet.add(key);
    });
    return Array.from(mSet).sort().reverse();
  }, [transactions]);

  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const currentM = getMonthKey(now.toISOString());
    const monthlyData: Record<string, number> = {};
    transactions.forEach(t => {
      if (getMonthKey(t.date) === currentM && !t.isIncome && t.category !== 'Account Transfer' && !t.isInternalTransfer) {
        monthlyData[t.category] = (monthlyData[t.category] || 0) + t.amount;
      }
    });
    return monthlyData;
  }, [transactions]);

  const budgetSummary = useMemo(() => {
    let totalLimit = 0, totalSpent = 0;
    spendingCategories.forEach(cat => {
      totalLimit += budgets[cat] || 0;
      totalSpent += currentMonthSpending[cat] || 0;
    });
    return { totalLimit, totalSpent, ratio: totalLimit > 0 ? (totalSpent / totalLimit) : 0 };
  }, [spendingCategories, budgets, currentMonthSpending]);

  const fingerprintData = useMemo(() => {
    if (transactions.length === 0) return [];
    const txs = transactions.filter(t => !t.isIncome && t.category !== 'Account Transfer' && !t.isInternalTransfer);
    const smallTxCount = txs.filter(t => t.amount < 25).length;
    const impulsivity = (smallTxCount / (txs.length || 1)) * 100;
    const weekendSpend = txs.filter(t => [0, 6].includes(new Date(t.date).getDay())).reduce((s, t) => s + t.amount, 0);
    const weekendEffect = (weekendSpend / (totals.realSpend || 1)) * 100;
    const essentialRatio = (txs.filter(t => ['Housing', 'Bills & Utilities', 'Transport'].includes(t.category)).reduce((s, t) => s + t.amount, 0) / (totals.realSpend || 1)) * 100;
    const merchants = new Set(txs.map(t => t.merchantName || t.description)).size;
    const loyalty = (1 - (merchants / (txs.length || 1))) * 100;
    return [
      { subject: 'Impulsivity', A: impulsivity, fullMark: 100 },
      { subject: 'Weekend Effect', A: weekendEffect, fullMark: 100 },
      { subject: 'Essential Ratio', A: essentialRatio, fullMark: 100 },
      { subject: 'Loyalty', A: loyalty, fullMark: 100 },
      { subject: 'Diversity', A: 50, fullMark: 100 }
    ];
  }, [transactions, totals.realSpend]);

  const sankeyData = useMemo((): SankeyData => {
    if (filteredTransactions.length === 0) return { nodes: [], links: [] };
    const nodesList: { name: string; id: string }[] = [{ name: "Flow Center", id: "source" }];
    const links: { source: number; target: number; value: number }[] = [];
    const categoryAggregates = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome && t.category !== 'Account Transfer' && !t.isInternalTransfer).forEach(t => {
      categoryAggregates.set(t.category, (categoryAggregates.get(t.category) || 0) + t.amount);
    });

    // Sort categories by amount (most to least) and group small ones
    const sortedCategories = Array.from(categoryAggregates.entries())
      .sort((a, b) => b[1] - a[1]); // Sort by amount descending
    
    // Group small categories (less than 5% of total or less than $100)
    const totalAmount = sortedCategories.reduce((sum, [_, amount]) => sum + amount, 0);
    const threshold = Math.max(totalAmount * 0.05, 100); // 5% of total or $100, whichever is larger
    
    const majorCategories = sortedCategories.filter(([_, amount]) => amount >= threshold);
    const minorCategories = sortedCategories.filter(([_, amount]) => amount < threshold);
    
    // Add major categories individually
    majorCategories.forEach(([catName, amount]) => {
      const nodeIndex = nodesList.length;
      nodesList.push({ name: catName, id: catName });
      links.push({ source: 0, target: nodeIndex, value: amount });
    });
    
    // Group minor categories into "Other"
    if (minorCategories.length > 0) {
      const otherTotal = minorCategories.reduce((sum, [_, amount]) => sum + amount, 0);
      const nodeIndex = nodesList.length;
      nodesList.push({ name: "Other", id: "other" });
      links.push({ source: 0, target: nodeIndex, value: otherTotal });
    }
    
    return { nodes: nodesList, links };
  }, [filteredTransactions]);

  const barData = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome && t.category !== 'Account Transfer' && !t.isInternalTransfer).forEach(t => {
      categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount);
    });
    return Array.from(categoryTotals.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const handleSuggest = async () => {
    if (transactions.length === 0) return;
    if (!aiEnabled) {
      alert("Enable AI in Settings to use budget suggestions.");
      return;
    }
    setIsSuggesting(true);
    try {
        const suggestions = await suggestBudgets(transactions);
        suggestions.forEach(s => {
            updateBudget(s.category, s.suggestedLimit);
        });
        alert("The Teller has suggested new monthly limits based on your historical averages.");
    } finally {
        setIsSuggesting(false);
    }
  };

  const updateBudget = (category: string, limit: number) => {
    setBudgets(prev => ({ ...prev, [category]: limit }));
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    if (!aiEnabled) {
      setChatHistory(prev => [...prev, { role: 'model', content: "Enable AI in Settings to chat with the Teller." }]);
      return;
    }
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    try {
      const response = await queryTransactions(userMessage, transactions);
      setChatHistory(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', content: "The Teller is away for a moment." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#fdfaf3]">
      {/* Mobile Top Header */}
      <div className="lg:hidden h-16 bg-[#062c1a] text-white flex items-center justify-between px-6 z-50 shadow-md">
        <Logo size="sm" isLight showTagline={false} />
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-xl w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10">
            <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:relative inset-y-0 left-0 w-80 bg-[#062c1a] text-white flex flex-col p-8 md:p-10 border-r-4 border-[#2d1810] shrink-0 z-40 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-12 md:mb-16 hidden lg:block">
          <Logo size="md" isLight={true} />
        </div>
        <nav className="flex-grow space-y-2 md:space-y-3">
          <button onClick={() => {setActiveTab('home'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-landmark w-5"></i> Spending View
          </button>
          <button onClick={() => {setActiveTab('budgets'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'budgets' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-vault w-5"></i> Budget Office
          </button>
          <button onClick={() => {setActiveTab('insights'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'insights' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-brain w-5"></i> Money Insights
          </button>
          <button onClick={() => {setActiveTab('history'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-scroll w-5"></i> Activity Record
          </button>
          <button onClick={() => {setActiveTab('assistant'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'assistant' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-user-tie w-5"></i> Consult the Teller
          </button>
          <button onClick={() => {setActiveTab('about'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'about' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-circle-question w-5"></i> About & Privacy
          </button>
        </nav>
        <div className="mt-auto pt-8 border-t border-emerald-900/40 space-y-4">
           <button onClick={handleExportData} className="w-full text-[10px] text-emerald-100/50 hover:text-[#c5a059] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
             <i className="fas fa-download"></i> Download Vault Backup
           </button>
           <div className="flex items-center justify-between gap-2">
             <span className="text-[10px] text-emerald-100/50 font-black uppercase tracking-widest">AI Features</span>
             <button
               onClick={() => setAiEnabled(!aiEnabled)}
               className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${aiEnabled ? 'bg-[#c5a059]' : 'bg-emerald-900/40'}`}
             >
               <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
             </button>
           </div>
           <p className="text-[10px] text-emerald-100/20 uppercase tracking-[0.2em] font-black text-center italic">"What is your money telling you?"</p>
           <button onClick={() => { if(confirm("Clear local data?")) { localStorage.clear(); window.location.reload(); } }} className="w-full text-[10px] text-emerald-900/60 hover:text-orange-300 font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
             <i className="fas fa-broom"></i> Re-lock Vault
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col overflow-hidden bg-[#fdfaf3]">
        <header className="hidden lg:flex h-24 bg-[#fdfaf3] border-b-2 border-[#dcd0b9] items-center justify-between px-12 z-10 shadow-sm shrink-0">
           <div className="flex items-center gap-3">
              <Logo size="sm" showTagline={false} />
              <div className="h-6 w-[2px] bg-[#dcd0b9] mx-2"></div>
              <h2 className="text-xl font-black text-[#062c1a] serif tracking-tight">Financial Ledger</h2>
           </div>
           <div className="flex items-center gap-4">
             <button onClick={handleExportData} className="px-6 py-4 rounded-md text-[11px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200 transition-all flex items-center gap-2">
               <i className="fas fa-download"></i> Backup
             </button>
             <label className="cursor-pointer brass-button text-white px-8 py-4 rounded-md text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-3 border border-amber-600/30">
               <i className="fas fa-file-arrow-up"></i> Import records
               <input type="file" className="hidden" accept=".csv,.json" multiple onChange={handleFileUpload} />
             </label>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto custom-scrollbar hero-gradient p-4 md:p-8 lg:p-12">
          {transactions.length === 0 && !isProcessing ? (
            <div className="max-w-5xl mx-auto py-8 lg:py-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="w-full lg:w-1/2">
                 <img src={TELLER_ILLUSTRATION} className="rounded-3xl lg:rounded-[5rem] shadow-2xl border-[6px] lg:border-[12px] border-white object-cover aspect-square" alt="Vintage Bank Scene" />
              </div>
              <div className="w-full lg:w-1/2 space-y-8 lg:space-y-10">
                <Logo size="lg" />
                <p className="text-slate-600 text-lg md:text-2xl leading-relaxed serif italic">"Every coin tells a tale, if you know how to listen."</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="cursor-pointer brass-button text-white px-12 py-6 rounded-xl font-black shadow-2xl text-xl uppercase tracking-widest border border-amber-600/30 text-center">
                    Begin Import →
                    <input type="file" className="hidden" accept=".csv,.json" multiple onChange={handleFileUpload} />
                  </label>
                  <button onClick={handleDemoData} className="px-12 py-6 rounded-xl font-black text-[#062c1a] bg-[#dcd0b9]/30 border-2 border-[#dcd0b9] hover:bg-[#dcd0b9]/50 transition-all text-xl uppercase tracking-widest">
                    Demo Mode
                  </button>
                </div>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full space-y-12 py-32">
              <div className="w-24 h-24 border-8 border-[#dcd0b9] border-t-[#062c1a] rounded-full animate-spin"></div>
              <h3 className="text-4xl font-black text-[#062c1a] serif italic text-center">Balancing the Ledger...</h3>
            </div>
          ) : (
            <div className="animate-in fade-in space-y-8 lg:space-y-12 max-w-7xl mx-auto pb-12">
              
              {activeTab === 'home' && (
                <div className="space-y-8 lg:space-y-12">
                  {/* Swipable Celebratory Awards */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black serif text-[#062c1a] flex items-center gap-2">
                            The Teller's Recognition <i className="fas fa-medal text-amber-500"></i>
                        </h3>
                        <p className="text-[10px] font-bold text-[#8c7851] uppercase tracking-widest hidden md:block">Scroll for more insights</p>
                    </div>
                    <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x custom-scrollbar">
                        {insights.map((ins, i) => (
                            <div key={i} className="min-w-[280px] md:min-w-[320px] snap-center p-6 md:p-8 rounded-3xl shadow-xl bg-white border-b-8 flex flex-col justify-between transition-transform hover:scale-[1.02] relative overflow-hidden" style={{ borderColor: ins.color }}>
                                <div className="absolute top-[-20px] right-[-20px] opacity-5 text-9xl">
                                    <i className={`fas ${ins.icon}`}></i>
                                </div>
                                <div className="flex justify-between items-start mb-4 md:mb-6 relative z-10">
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl md:text-2xl text-white shadow-lg" style={{ backgroundColor: ins.color }}>
                                        <i className={`fas ${ins.icon}`}></i>
                                    </div>
                                    <div className="bg-[#fdfaf3] px-3 py-1 rounded-full border border-[#dcd0b9] text-[9px] font-black uppercase tracking-widest text-[#8c7851]">Award No. {i+1}</div>
                                </div>
                                <div className="relative z-10">
                                    <h4 className="text-lg font-black serif italic mb-2 leading-tight text-[#062c1a]">{ins.title}</h4>
                                    <p className="text-[11px] text-[#3e3e3e] leading-relaxed font-medium opacity-80">{ins.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>

                  {/* Expected Values Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white p-8 lg:p-10 rounded-2xl card-shadow border-t-8 border-[#062c1a]">
                       <p className="text-[10px] font-black text-[#8c7851] uppercase tracking-widest mb-4">Total Real Spending</p>
                       <h2 className="text-3xl lg:text-5xl font-black text-[#062c1a] tracking-tight serif">${totals.realSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                       <p className="text-[9px] text-[#8c7851] mt-2 font-bold uppercase italic opacity-60">Excluding transfers</p>
                    </div>
                    <div className="bg-white p-8 lg:p-10 rounded-2xl card-shadow border-t-8 border-indigo-900">
                       <p className="text-[10px] font-black text-[#8c7851] uppercase tracking-widest mb-4">Net Narrative Position</p>
                       <h2 className={`text-3xl lg:text-4xl font-black serif ${totals.net >= 0 ? 'text-green-800' : 'text-red-900'}`}>{totals.net >= 0 ? '+' : '-'}${Math.abs(totals.net).toLocaleString()}</h2>
                       <p className="text-[9px] text-[#8c7851] mt-2 font-bold uppercase italic opacity-60">Total Delta</p>
                    </div>
                    <div className="bg-white p-8 lg:p-10 rounded-2xl card-shadow border-t-8 border-[#c5a059]">
                       <p className="text-[10px] font-black text-[#8c7851] uppercase tracking-widest mb-4">Avg Monthly Outflow</p>
                       <h2 className="text-3xl lg:text-4xl font-black text-[#062c1a] serif">${(totals.realSpend / (months.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                       <p className="text-[9px] text-[#8c7851] mt-2 font-bold uppercase italic opacity-60">Over {months.length} mo.</p>
                    </div>
                    <div className="bg-white p-8 lg:p-10 rounded-2xl card-shadow border-t-8 border-[#2d1810]">
                       <p className="text-[10px] font-black text-[#8c7851] uppercase tracking-widest mb-4">Avg Monthly Inbound</p>
                       <h2 className="text-3xl lg:text-4xl font-black text-[#062c1a] serif">${(totals.moneyIn / (months.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                       <p className="text-[9px] text-[#8c7851] mt-2 font-bold uppercase italic opacity-60">Historical avg</p>
                    </div>
                  </div>

                  {/* Visualizations Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12">
                    <div className="xl:col-span-8 space-y-8 lg:space-y-12">
                      <div className="bg-white p-6 md:p-8 lg:p-12 rounded-3xl card-shadow border border-[#dcd0b9] relative overflow-hidden">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-10 gap-4">
                            <h3 className="text-xl md:text-2xl font-black text-[#062c1a] serif italic flex items-center gap-3">
                              The Capital River 
                              <div className="group relative">
                                <i className="fas fa-circle-info text-xs text-[#8c7851] cursor-help"></i>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-56 p-4 bg-[#2d1810] text-white text-[10px] rounded-xl shadow-2xl z-20 leading-relaxed font-medium">
                                  This diagram tracks spending flows. Internal transfers (like CC payments) are excluded to ensure accuracy.
                                </div>
                              </div>
                            </h3>
                            <div className="flex bg-[#fdfaf3] p-1 rounded-xl border-2 border-[#dcd0b9] overflow-x-auto shadow-inner">
                               <button onClick={() => setFilterMonth('all')} className={`px-4 md:px-5 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap transition-all ${filterMonth === 'all' ? 'bg-[#062c1a] text-white shadow-lg' : 'text-[#8c7851] hover:bg-white'}`}>All-Time</button>
                               {months.slice(0, 3).map(m => (
                                 <button key={m} onClick={() => setFilterMonth(m)} className={`px-4 md:px-5 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap transition-all ${filterMonth === m ? 'bg-[#062c1a] text-white shadow-lg' : 'text-[#8c7851] hover:bg-white'}`}>{m}</button>
                               ))}
                            </div>
                         </div>
                         <div className="w-full flex justify-center items-center overflow-x-auto overflow-y-visible min-h-[500px] lg:min-h-[600px]">
                            <div className="min-w-[800px]">
                               <SankeyChart data={sankeyData} height={600} onNodeClick={(name) => { setSelectedCategory(name); setActiveTab('history'); }} />
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="xl:col-span-4 space-y-8 lg:space-y-12">
                       <div className="bg-white p-8 md:p-10 rounded-3xl card-shadow border border-[#dcd0b9]">
                          <h4 className="text-[10px] font-black text-[#8c7851] uppercase tracking-widest mb-8 flex items-center justify-between">
                            Financial Fingerprint
                            <div className="group relative">
                                <i className="fas fa-circle-info text-xs text-[#8c7851] cursor-help"></i>
                                <div className="absolute top-full right-0 mt-3 hidden group-hover:block w-56 p-4 bg-[#2d1810] text-white text-[10px] rounded-xl shadow-2xl z-20 leading-relaxed font-medium">
                                  Your unique spending DNA geometry.
                                </div>
                              </div>
                          </h4>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="85%" data={fingerprintData}>
                                <PolarGrid 
                                  stroke="#e5e7eb" 
                                  strokeWidth={1}
                                  radialLines={true}
                                />
                                <PolarAngleAxis 
                                  dataKey="subject" 
                                  tick={{ 
                                    fill: '#374151', 
                                    fontSize: 11, 
                                    fontWeight: 600,
                                    className: "uppercase tracking-wide"
                                  }} 
                                  axisLine={false}
                                />
                                <PolarRadiusAxis 
                                  angle={90} 
                                  domain={[0, 100]} 
                                  tick={{ 
                                    fill: '#9ca3af', 
                                    fontSize: 9,
                                    fontWeight: 500
                                  }}
                                  axisLine={false}
                                />
                                <Radar 
                                  name="Fingerprint" 
                                  dataKey="A" 
                                  stroke="#1e40af" 
                                  fill="#3b82f6" 
                                  fillOpacity={0.6}
                                  strokeWidth={2}
                                  dot={{ r: 4, fill: "#1e40af" }}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#f3f4f6'
                                  }}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-8 space-y-4">
                             <div className="p-4 bg-[#fdfaf3] rounded-xl border border-[#dcd0b9]">
                                <p className="text-[10px] font-black uppercase text-[#8c7851] mb-1">Peak Intensity</p>
                                <p className="text-sm font-black text-[#062c1a] serif italic truncate">{barData[0]?.name || 'N/A'}</p>
                             </div>
                             <div className="p-4 bg-[#fdfaf3] rounded-xl border border-[#dcd0b9]">
                                <p className="text-[10px] font-black uppercase text-[#8c7851] mb-1">Vault Status</p>
                                <p className="text-sm font-black text-emerald-800 serif italic">Local Storage Active</p>
                             </div>
                          </div>
                       </div>

                       <div className="bg-[#062c1a] p-10 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
                          <h4 className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-6 flex items-center justify-between">
                            The "Habit Tax" Assessment
                            <div className="group relative">
                                <i className="fas fa-circle-info text-xs text-[#c5a059] cursor-help"></i>
                                <div className="absolute top-full right-0 mt-3 hidden group-hover:block w-56 p-4 bg-zinc-800 text-white text-[10px] rounded-xl shadow-2xl z-20 font-medium normal-case tracking-normal">
                                  How small leaks impact your legacy.
                                </div>
                              </div>
                          </h4>
                          <div className="space-y-6">
                             <div>
                                <p className="text-[10px] font-bold text-emerald-100/60 mb-1 tracking-wider uppercase">Redirect Minor Streams</p>
                                <p className="text-3xl font-black serif italic text-[#c5a059]">+$1,200/Year</p>
                             </div>
                             <hr className="border-emerald-900" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]/60">10-Year Nest Egg (7%)</p>
                             <p className="text-4xl font-black serif text-white">$17,730</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-12 p-6 md:p-10 lg:p-12 max-w-7xl mx-auto">
                  <div className="bg-gradient-to-br from-[#062c1a] to-[#2d1810] text-white p-8 md:p-12 lg:p-16 rounded-3xl card-shadow border border-[#c5a059]/40 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 mix-blend-soft-light pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at top left, #c5a059 0, transparent 55%), radial-gradient(circle at bottom right, #fdfaf3 0, transparent 55%)' }}></div>
                    <div className="relative z-10 space-y-4 md:space-y-6">
                      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-100/60">Money Insights Ledger</p>
                      <h1 className="text-3xl md:text-5xl font-black serif italic leading-tight">Your Financial Intelligence Report</h1>
                      <p className="text-amber-100/70 text-sm md:text-base max-w-2xl">
                        Deep insights drawn from {transactions.length.toLocaleString()} transactions in your private vault. No servers, no uploads—just your browser and your ledger.
                      </p>
                    </div>
                  </div>

                  <section className="bg-white rounded-3xl card-shadow border border-[#dcd0b9] p-6 md:p-10 lg:p-12 space-y-8">
                    <HabitTaxCalculator transactions={transactions} />
                  </section>

                  <section className="bg-white rounded-3xl card-shadow border border-[#dcd0b9] p-6 md:p-10 lg:p-12 space-y-8">
                    <ParetoAnalysis transactions={transactions} />
                  </section>

                  <section className="bg-white rounded-3xl card-shadow border border-[#dcd0b9] p-6 md:p-10 lg:p-12 space-y-8">
                    <LifestyleInflationDetector transactions={transactions} />
                  </section>

                  <section className="bg-white rounded-3xl card-shadow border border-[#dcd0b9] p-6 md:p-10 lg:p-12 space-y-8">
                    <CashFlowWaterfall transactions={transactions} />
                  </section>

                  <section className="bg-white rounded-3xl card-shadow border border-[#dcd0b9] p-6 md:p-10 lg:p-12 space-y-8">
                    <FinancialFingerprintInsight transactions={transactions} habitTaxResults={[]} />
                  </section>
                </div>
              )}

              {activeTab === 'budgets' && (
                <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
                  <div className="bg-[#062c1a] p-10 lg:p-16 rounded-3xl lg:rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                       <div className="max-w-xl">
                            <h3 className="text-3xl md:text-5xl font-black serif italic text-[#c5a059] mb-4">The Budget Office</h3>
                            <p className="text-emerald-100/60 font-medium tracking-wide leading-relaxed">Assign monthly limits to your narrative chapters. The Teller analyzes your averages to suggest reasonable boundaries.</p>
                       </div>
                       <button 
                        onClick={handleSuggest}
                        disabled={isSuggesting}
                        className={`px-8 md:px-10 py-4 md:py-5 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 border border-amber-600/30 ${isSuggesting ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'brass-button text-white active:scale-95'}`}>
                            {isSuggesting ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                            {isSuggesting ? "Analyzing..." : "Suggest Limits"}
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {spendingCategories.map((cat) => {
                      const limit = budgets[cat] || 0, spent = currentMonthSpending[cat] || 0, ratio = limit > 0 ? (spent / limit) : 0;
                      return (
                        <div key={cat} className="bg-white p-6 md:p-8 rounded-3xl card-shadow border border-[#dcd0b9] group hover:border-[#c5a059] transition-all">
                          <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#fdfaf3] border border-[#dcd0b9] flex items-center justify-center text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-white transition-all">
                              <i className={`fas ${CATEGORY_ICONS[cat] || 'fa-tag'}`}></i>
                            </div>
                            <h4 className="font-black text-[#062c1a] serif italic">{cat}</h4>
                          </div>
                          <div className="flex justify-between items-end mb-6">
                             <div>
                               <p className="text-[10px] font-black uppercase text-[#8c7851] tracking-widest mb-1">Spent (Mo.)</p>
                               <p className="text-xl md:text-2xl font-black">${spent.toLocaleString()}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] font-black uppercase text-[#8c7851] tracking-widest mb-1">Monthly Limit</p>
                               <div className="flex items-center gap-1">
                                    <span className="text-[#8c7851] font-black">$</span>
                                    <input type="number" className="w-20 md:w-24 bg-[#fdfaf3] border-b-2 border-[#dcd0b9] text-right font-black p-1 focus:border-[#c5a059] outline-none" value={limit || ''} placeholder="0" onChange={(e) => updateBudget(cat, parseFloat(e.target.value) || 0)} />
                               </div>
                             </div>
                          </div>
                          <div className="h-2 w-full bg-[#fdfaf3] rounded-full overflow-hidden border border-[#dcd0b9]">
                             <div className={`h-full transition-all duration-700 ${ratio > 1 ? 'bg-red-800' : ratio > 0.8 ? 'bg-[#c5a059]' : 'bg-[#062c1a]'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
                  <SmartCategorizationSuggestions
                    transactions={transactions}
                    onCategorize={handleBulkCategorize}
                    categorizationLearner={categorizationLearner}
                  />
                  
                  <div className="bg-white p-6 md:p-8 rounded-2xl card-shadow border border-[#dcd0b9] flex flex-col md:flex-row items-center gap-4 md:gap-6">
                     <div className="relative flex-grow w-full">
                        <i className="fas fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-[#dcd0b9]"></i>
                        <input type="text" placeholder="Search the narratives..." className="w-full bg-[#fdfaf3] border-2 border-[#dcd0b9] rounded-lg py-4 md:py-5 pl-16 pr-8 text-sm font-bold focus:border-[#c5a059] outline-none transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     </div>
                     <div className="flex w-full md:w-auto gap-4">
                        <select className="flex-grow md:w-auto bg-[#fdfaf3] border-2 border-[#dcd0b9] rounded-lg py-4 md:py-5 px-6 md:px-10 text-sm font-bold outline-none cursor-pointer focus:border-[#c5a059] transition-all" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            <option value="all">Every Chapter</option>
                            {categoriesAvailable.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={() => {setSearchTerm(''); setSelectedCategory('all')}} className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-[#fdfaf3] border-2 border-[#dcd0b9] hover:bg-white flex items-center justify-center text-[#8c7851] transition-all"><i className="fas fa-rotate-left"></i></button>
                     </div>
                  </div>

                  <div className="bg-white rounded-2xl md:rounded-3xl card-shadow border border-[#dcd0b9] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                        <thead className="bg-[#fdfaf3] text-[10px] font-black uppercase tracking-widest text-[#8c7851] border-b-2 border-[#dcd0b9]">
                            <tr>
                            <th className="py-6 md:py-10 px-6 md:px-12 whitespace-nowrap">Entity</th>
                            <th className="py-6 md:py-10 px-6 md:px-12">Classification</th>
                            <th className="py-6 md:py-10 px-6 md:px-12 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dcd0b9]/40">
                            {filteredTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-[#fdfaf3] transition-all group">
                                <td className="py-6 md:py-8 px-6 md:px-12">
                                <p className="text-sm font-black serif italic text-[#062c1a] mb-1 truncate max-w-[140px] md:max-w-none">{t.merchantName || t.description}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-wider">{t.date}</p>
                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-400 font-black uppercase tracking-tighter truncate max-w-[80px]">{t.source.split('.csv')[0]}</span>
                                </div>
                                </td>
                                <td className="py-6 md:py-8 px-6 md:px-12">
                                {editingTransactionId === t.id ? (
                                  <select
                                    value={editCategory}
                                    onChange={e => setEditCategory(e.target.value)}
                                    onBlur={() => saveCategoryEdit(t.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveCategoryEdit(t.id); }}
                                    className="px-3 py-1 rounded-md border border-[#c5a059] text-[9px] font-black uppercase tracking-widest bg-white text-[#062c1a]"
                                    autoFocus
                                  >
                                    <option value="Uncategorized">Uncategorized</option>
                                    <option value="Account Transfer">Account Transfer</option>
                                    <option value="Income">Income</option>
                                    {spendingCategories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    onClick={() => { setEditingTransactionId(t.id); setEditCategory(t.category); }}
                                    className={`cursor-pointer hover:opacity-80 px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[9px] font-black uppercase tracking-widest border ${t.category === 'Account Transfer' ? 'bg-[#2d1810] text-white border-transparent' : 'text-[#062c1a] border-[#c5a059]'}`}
                                  >
                                    {t.category}
                                  </span>
                                )}
                                </td>
                                <td className={`py-6 md:py-8 px-6 md:px-12 text-right text-sm font-black ${t.isIncome ? 'text-green-800' : 'text-[#2d1810]'}`}>
                                ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'assistant' && (
                <div className="max-w-4xl mx-auto h-[70vh] md:h-[78vh] flex flex-col bg-white rounded-3xl card-shadow border-2 border-[#dcd0b9] overflow-hidden">
                   <div className="p-6 md:p-10 bg-[#062c1a] text-white font-black serif text-xl italic border-b-2 border-[#dcd0b9] shadow-md flex justify-between items-center">
                        <span>The Teller's Desk</span>
                        <i className="fas fa-feather-pointed text-amber-500/50"></i>
                   </div>
                   <div className="flex-grow overflow-y-auto p-6 md:p-12 space-y-6 md:space-y-10 custom-scrollbar bg-[#fdfaf3]/50">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[85%] md:max-w-[75%] p-5 md:p-8 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#2d1810] text-white font-bold shadow-xl' : 'bg-white border-2 border-[#dcd0b9] shadow-sm'}`}>
                              {msg.content}
                           </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                           <div className="bg-white p-6 rounded-2xl border-2 border-[#dcd0b9] shadow-sm flex items-center gap-3">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-150"></div>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#8c7851]">Reconciling...</span>
                           </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                   </div>
                   <form onSubmit={handleChat} className="p-6 md:p-10 bg-white border-t-2 border-[#dcd0b9]">
                      <div className="relative group">
                        <input type="text" placeholder="Inquire..." className="w-full bg-[#fdfaf3] border-2 border-[#dcd0b9] rounded-xl py-4 md:py-6 pl-6 md:pl-10 pr-32 md:pr-40 text-sm font-bold focus:border-[#c5a059] outline-none transition-all shadow-inner" value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                        <button type="submit" className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 brass-button text-white px-6 md:px-10 py-3 md:py-4 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl">Inquire</button>
                      </div>
                   </form>
                </div>
              )}

              {activeTab === 'about' && (
                <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 py-8">
                    <section className="bg-white p-8 md:p-12 rounded-3xl card-shadow border border-[#dcd0b9] space-y-6 md:space-y-8 animate-in">
                        <h3 className="text-3xl md:text-4xl font-black serif italic text-[#062c1a]">The Origin</h3>
                        <div className="w-20 h-1 bg-[#c5a059]"></div>
                        <p className="text-lg text-slate-700 leading-relaxed font-medium">"Teller was built to turn cold records into a narrative, and to do so with complete, uncompromised privacy."</p>
                        <p className="text-slate-600 leading-relaxed">Financial data is the most intimate record of our lives. Teller ensures this record stays yours. Your data never touches a server; it lives solely in your browser's local memory, accessible even when you're off the grid.</p>
                    </section>
                    
                    <section className="bg-[#2d1810] p-8 md:p-12 rounded-3xl shadow-2xl text-white space-y-6 md:space-y-8">
                        <h3 className="text-2xl font-black serif italic text-[#c5a059]">The Privacy Manifesto</h3>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-900 flex items-center justify-center shrink-0 border border-emerald-700"><i className="fas fa-shield-halved text-xs text-amber-100"></i></div>
                                <div>
                                    <p className="font-bold text-amber-100 uppercase tracking-widest text-[11px] mb-1">True Offline Freedom</p>
                                    <p className="text-sm opacity-70">Your files are parsed locally. No cloud, no risk. Download a backup to keep your records portable.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-900 flex items-center justify-center shrink-0 border border-emerald-700"><i className="fas fa-broom text-xs text-amber-100"></i></div>
                                <div>
                                    <p className="font-bold text-amber-100 uppercase tracking-widest text-[11px] mb-1">Privacy-First AI</p>
                                    <p className="text-sm opacity-70">Identifiable details are stripped before categorization, ensuring merchant intent is all the model ever sees.</p>
                                </div>
                            </li>
                        </ul>
                    </section>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .serif { font-family: 'Fraunces', serif; }
        .hero-gradient { background: radial-gradient(circle at top right, #f4eee1 0%, #fdfaf3 100%); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #dcd0b9; border-radius: 10px; }
        .snap-x { scroll-snap-type: x mandatory; scroll-behavior: smooth; }
        .snap-center { scroll-snap-align: center; }
      `}</style>
    </div>
  );
};

export default App;
