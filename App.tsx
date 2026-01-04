
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, SpendingInsight, SankeyData, ChatMessage, FinancialFingerprint } from './types';
import { categorizeTransactions, getSpendingInsights, queryTransactions } from './services/geminiService';
import SankeyChart from './components/SankeyChart';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

export const COLORS = ['#062c1a', '#2d1810', '#c5a059', '#634b3e', '#8c7851', '#dcd0b9', '#3e3e3e', '#e8e1d4'];
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
        {showTagline && <span className={`font-medium tracking-tight serif ${size === 'lg' ? 'text-lg mt-1' : 'text-[10px]'} ${tagColor}`}>Help Making Your Money Taller.</span>}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('teller_txs');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('teller_budgets');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'assistant' | 'budgets'>('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', content: "Welcome to the Teller's desk. I've analyzed your financial records securely. How may I assist in making your money grow taller today?", isInitial: true }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('teller_txs', JSON.stringify(transactions));
    if (transactions.length > 0 && insights.length === 0) refreshInsights();
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('teller_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const refreshInsights = async () => {
    const newInsights = await getSpendingInsights(transactions);
    setInsights(newInsights);
  };

  const handleDemoData = () => {
    const today = new Date();
    const demo: Transaction[] = [
      { id: 'd1', date: today.toISOString().split('T')[0], description: 'Monthly Salary', amount: 5000, category: 'Income', isIncome: true, source: 'Payroll' },
      { id: 'd2', date: today.toISOString().split('T')[0], description: 'Rent Payment', amount: 2000, category: 'Housing', isIncome: false, source: 'Checking' },
      { id: 'd3', date: today.toISOString().split('T')[0], description: 'Starbucks Coffee', amount: 6.50, category: 'Food & Drink', isIncome: false, source: 'Credit Card' },
      { id: 'd4', date: today.toISOString().split('T')[0], description: 'Uber Trip', amount: 24.00, category: 'Transport', isIncome: false, source: 'Credit Card' },
      { id: 'd5', date: today.toISOString().split('T')[0], description: 'Grocery Store', amount: 156.40, category: 'Food & Drink', isIncome: false, source: 'Checking' },
      { id: 'd6', date: today.toISOString().split('T')[0], description: 'Amazon Order', amount: 89.99, category: 'Shopping', isIncome: false, source: 'Credit Card' },
      { id: 'd7', date: today.toISOString().split('T')[0], description: 'Electric Bill', amount: 120.00, category: 'Bills & Utilities', isIncome: false, source: 'Checking' },
      { id: 'd8', date: today.toISOString().split('T')[0], description: 'Gym Membership', amount: 50.00, category: 'Wellness & Health', isIncome: false, source: 'Checking' },
      { id: 'd9', date: today.toISOString().split('T')[0], description: 'Netflix', amount: 19.99, category: 'Fun & Hobbies', isIncome: false, source: 'Credit Card' },
      { id: 'd10', date: today.toISOString().split('T')[0], description: 'Friday Drinks', amount: 45.00, category: 'Food & Drink', isIncome: false, source: 'Credit Card' }
    ];
    setTransactions(demo);
    setBudgets({ 'Food & Drink': 500, 'Shopping': 300, 'Transport': 200 });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
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
              if (!dateH || !amtH) return res([]);
              res((results.data as any[]).map((row, idx) => ({
                id: `${file.name}-${idx}-${Date.now()}`,
                date: row[dateH],
                description: row[descH!] || 'Activity',
                amount: Math.abs(parseFloat(row[amtH].toString().replace(/[$,]/g, '')) || 0),
                category: 'Categorizing...',
                isIncome: parseFloat(row[amtH].toString().replace(/[$,]/g, '')) > 0,
                source: file.name
              })));
            }
          });
        });
        allNewTransactions = [...allNewTransactions, ...parsed];
      }
      const cats = await categorizeTransactions(allNewTransactions);
      const enriched = allNewTransactions.map(t => {
        const match = cats.find(c => c.id === t.id);
        return { ...t, merchantName: match?.merchant, category: match?.category || 'Uncategorized' };
      });
      setTransactions([...transactions, ...enriched]);
      await refreshInsights();
    } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  };

  // Fixed: Defined filteredTransactions to resolve ReferenceErrors
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (t.merchantName?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesMonth = filterMonth === 'all' || t.date.startsWith(filterMonth);
      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [transactions, searchTerm, selectedCategory, filterMonth]);

  // Fixed: Defined categoriesAvailable for the filter dropdown
  const categoriesAvailable = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  // Fixed: Defined spendingCategories for budgeting logic
  const spendingCategories = useMemo(() => {
    return categoriesAvailable.filter(c => c !== 'Income' && c !== 'Account Transfer' && c !== 'Categorizing...');
  }, [categoriesAvailable]);

  const totals = useMemo(() => {
    const realSpend = filteredTransactions.filter(t => !t.isIncome && !t.isInternalTransfer).reduce((s, t) => s + t.amount, 0);
    const moneyIn = filteredTransactions.filter(t => t.isIncome && !t.isInternalTransfer).reduce((s, t) => s + t.amount, 0);
    return { realSpend, moneyIn, net: moneyIn - realSpend };
  }, [filteredTransactions]);

  const barData = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome && !t.isInternalTransfer).forEach(t => {
      categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount);
    });
    return Array.from(categoryTotals.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const currentM = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthlyData: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const mKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (mKey === currentM && !t.isIncome && !t.isInternalTransfer) monthlyData[t.category] = (monthlyData[t.category] || 0) + t.amount;
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
    const txs = transactions.filter(t => !t.isIncome);
    const smallTxCount = txs.filter(t => t.amount < 25).length;
    const impulsivity = (smallTxCount / txs.length) * 100;
    const weekendSpend = txs.filter(t => [0, 6].includes(new Date(t.date).getDay())).reduce((s, t) => s + t.amount, 0);
    const weekendEffect = (weekendSpend / (totals.realSpend || 1)) * 100;
    const essentialRatio = (txs.filter(t => ['Housing', 'Bills & Utilities', 'Transport'].includes(t.category)).reduce((s, t) => s + t.amount, 0) / (totals.realSpend || 1)) * 100;
    const merchants = new Set(txs.map(t => t.description)).size;
    const loyalty = (1 - (merchants / txs.length)) * 100;
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
    const nodesList: { name: string; id: string }[] = [{ name: "Capital Source", id: "source" }];
    const links: { source: number; target: number; value: number }[] = [];
    const categoryAggregates = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome && !t.isInternalTransfer).forEach(t => {
      categoryAggregates.set(t.category, (categoryAggregates.get(t.category) || 0) + t.amount);
    });
    categoryAggregates.forEach((amount, catName) => {
      const nodeIndex = nodesList.length;
      nodesList.push({ name: catName, id: catName });
      links.push({ source: 0, target: nodeIndex, value: amount });
    });
    return { nodes: nodesList, links };
  }, [filteredTransactions]);

  const months = useMemo(() => {
    const mSet = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) mSet.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    });
    return Array.from(mSet).sort().reverse();
  }, [transactions]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);
    const response = await queryTransactions(userMsg, transactions);
    setChatHistory(prev => [...prev, { role: 'model', content: response }]);
    setIsChatLoading(false);
  };

  const updateBudget = (category: string, limit: number) => {
    setBudgets(prev => ({ ...prev, [category]: limit }));
  };

  const clearFilters = () => {
    setFilterMonth('all');
    setSelectedCategory('all');
    setSearchTerm('');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-80 bg-[#062c1a] text-white flex flex-col p-10 border-r-4 border-[#2d1810] shrink-0">
        <div className="mb-16">
          <Logo size="md" isLight={true} />
        </div>
        <nav className="flex-grow space-y-4">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-landmark w-5"></i> Spending View
          </button>
          <button onClick={() => setActiveTab('budgets')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'budgets' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-vault w-5"></i> Budget Office
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-scroll w-5"></i> Activity Record
          </button>
          <button onClick={() => setActiveTab('assistant')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'assistant' ? 'bg-[#c5a059] text-[#062c1a] shadow-inner' : 'text-emerald-100/60 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-user-tie w-5"></i> Consult the Teller
          </button>
        </nav>
        <div className="mt-auto pt-8 border-t border-emerald-900/40">
           <div className="bg-emerald-950/40 p-6 rounded-xl border border-emerald-900/50 mb-8">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Vault Security Active</p>
              </div>
              <p className="text-[11px] text-emerald-100/50 leading-relaxed font-medium">Data stays local on your machine.</p>
           </div>
           <button onClick={() => { if(confirm("Clear local data?")) { localStorage.clear(); window.location.reload(); } }} className="text-[10px] text-emerald-900/60 hover:text-orange-300 font-black uppercase tracking-widest flex items-center gap-2 transition-all">
             <i className="fas fa-broom"></i> Re-lock Vault
           </button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col overflow-hidden bg-[#fdfaf3]">
        <header className="h-24 bg-[#fdfaf3] border-b-2 border-[#dcd0b9] flex items-center justify-between px-12 z-10 shadow-sm">
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <Logo size="sm" showTagline={false} />
                <div className="h-6 w-[2px] bg-[#dcd0b9] mx-2"></div>
                <h2 className="text-xl font-black text-[#062c1a] serif tracking-tight">Help Making Your Money Taller</h2>
              </div>
           </div>
           <div className="flex items-center gap-8">
             {transactions.length > 0 && (
               <div className="flex items-center gap-4 border-r-2 border-[#dcd0b9] pr-8">
                  <div className="text-right">
                     <p className="text-[9px] font-black text-[#8c7851] uppercase tracking-widest">Balance Delta</p>
                     <p className={`text-sm font-black ${totals.net >= 0 ? 'text-green-800' : 'text-red-900'}`}>
                       {totals.net >= 0 ? '+' : '-'}${Math.abs(totals.net).toLocaleString()}
                     </p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${totals.net >= 0 ? 'border-green-800 text-green-800' : 'border-red-900 text-red-900'}`}>
                     <i className={`fas ${totals.net >= 0 ? 'fa-caret-up' : 'fa-caret-down'}`}></i>
                  </div>
               </div>
             )}
             <label className="cursor-pointer brass-button text-white px-8 py-4 rounded-md text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-3 border border-amber-600/30">
               <i className="fas fa-upload"></i> Import Records
               <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} />
             </label>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto custom-scrollbar hero-gradient">
          {transactions.length === 0 && !isProcessing ? (
            <div className="max-w-5xl mx-auto py-16 px-8 flex flex-col lg:flex-row items-center gap-16">
              <div className="w-full lg:w-1/2">
                 <img src={TELLER_ILLUSTRATION} className="rounded-[5rem] shadow-2xl border-[12px] border-white object-cover aspect-square" alt="Vintage Bank Scene" />
              </div>
              <div className="w-full lg:w-1/2 space-y-10">
                <Logo size="lg" />
                <p className="text-slate-600 text-lg leading-relaxed serif italic">"Information is the first step toward height."</p>
                <p className="text-slate-600 text-md">Import your bank's CSV files to generate advanced financial visualizations locally and privately.</p>
                <div className="flex gap-4">
                  <label className="cursor-pointer brass-button text-white px-12 py-6 rounded-xl font-black shadow-2xl text-xl uppercase tracking-widest border border-amber-600/30">
                    Step up to counter →
                    <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} />
                  </label>
                  <button onClick={handleDemoData} className="px-12 py-6 rounded-xl font-black text-[#062c1a] bg-[#dcd0b9]/30 border-2 border-[#dcd0b9] hover:bg-[#dcd0b9]/50 transition-all text-xl uppercase tracking-widest">
                    View Demo Records
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
            <div className="animate-in fade-in space-y-12 p-12 max-w-7xl mx-auto">
              {activeTab === 'home' && (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="bg-white p-10 rounded-2xl card-shadow border-t-8 border-[#062c1a]">
                       <p className="text-[10px] font-black text-[#8c7851] uppercase tracking-widest mb-4">Total Expenses</p>
                       <h2 className="text-5xl font-black text-[#062c1a] tracking-tight serif">${totals.realSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                    </div>
                    <div className="bg-white p-10 rounded-2xl card-shadow border-t-8 border-[#c5a059] cursor-pointer" onClick={() => setActiveTab('budgets')}>
                       <p className="text-[10px] font-black text-[#8c7851] uppercase tracking-widest mb-4">Budget Health</p>
                       <div className="flex items-end justify-between">
                         <h2 className={`text-4xl font-black serif ${budgetSummary.ratio > 1 ? 'text-red-900' : 'text-[#062c1a]'}`}>{Math.round(budgetSummary.ratio * 100)}%</h2>
                         <p className="text-[10px] font-bold text-[#8c7851] mb-2 uppercase">Used</p>
                       </div>
                       <div className="mt-4 h-1.5 w-full bg-[#fdfaf3] rounded-full overflow-hidden border border-[#dcd0b9]">
                         <div className={`h-full transition-all duration-1000 ${budgetSummary.ratio > 0.9 ? 'bg-[#2d1810]' : 'bg-[#062c1a]'}`} style={{ width: `${Math.min(100, budgetSummary.ratio * 100)}%` }}></div>
                       </div>
                    </div>
                    {insights.slice(0, 2).map((ins, i) => (
                      <div key={i} className={`p-10 rounded-2xl card-shadow border-t-8 border-[#c5a059] ${ins.type === 'milestone' ? 'bg-[#062c1a] text-white' : 'bg-white'}`}>
                        <h4 className="text-base font-black serif italic mb-2 leading-tight">{ins.title}</h4>
                        <p className="text-[12px] opacity-70 leading-relaxed">{ins.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                    <div className="xl:col-span-8 space-y-12">
                      <div className="bg-white p-12 rounded-3xl card-shadow border border-[#dcd0b9]">
                         <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black text-[#062c1a] serif italic">Capital Flow Architecture</h3>
                            <div className="flex bg-[#fdfaf3] p-1 rounded-xl border-2 border-[#dcd0b9]">
                               <button onClick={() => setFilterMonth('all')} className={`px-6 py-3 rounded-lg text-[10px] font-black uppercase ${filterMonth === 'all' ? 'bg-[#062c1a] text-white' : 'text-[#8c7851]'}`}>Full Record</button>
                               {months.slice(0, 2).map(m => (
                                 <button key={m} onClick={() => setFilterMonth(m)} className={`px-6 py-3 rounded-lg text-[10px] font-black uppercase ${filterMonth === m ? 'bg-[#062c1a] text-white' : 'text-[#8c7851]'}`}>{m}</button>
                               ))}
                            </div>
                         </div>
                         <SankeyChart data={sankeyData} height={400} onNodeClick={(name) => { setSelectedCategory(name); setActiveTab('history'); }} />
                      </div>

                      <div className="bg-white p-12 rounded-3xl card-shadow border border-[#dcd0b9]">
                         <h3 className="text-2xl font-black text-[#062c1a] serif italic mb-10">Decision Waterfall</h3>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center bg-[#062c1a] text-white p-6 rounded-xl">
                               <span className="font-black serif italic">Starting Capital (Income)</span>
                               <span className="font-black text-xl">${totals.moneyIn.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-red-900/10 text-red-900 p-6 rounded-xl border border-red-900/20">
                               <span className="font-bold">Essential Expenses</span>
                               <span className="font-black">-${(totals.realSpend * 0.6).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-amber-900/10 text-[#2d1810] p-6 rounded-xl border border-amber-900/20">
                               <span className="font-bold">Discretionary Spending</span>
                               <span className="font-black">-${(totals.realSpend * 0.4).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-100 text-[#062c1a] p-8 rounded-2xl border-2 border-[#062c1a] mt-8 shadow-inner">
                               <span className="font-black text-xl serif italic">Net Growth Position</span>
                               <span className="font-black text-2xl">${totals.net.toLocaleString()}</span>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="xl:col-span-4 space-y-12">
                       <div className="bg-white p-10 rounded-3xl card-shadow border border-[#dcd0b9]">
                          <h4 className="text-[10px] font-black text-[#8c7851] uppercase tracking-widest mb-8">Financial Fingerprint</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={fingerprintData}>
                                <PolarGrid stroke="#dcd0b9" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8c7851', fontSize: 10, fontWeight: 800 }} />
                                <Radar name="Fingerprint" dataKey="A" stroke="#062c1a" fill="#062c1a" fillOpacity={0.4} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-8 space-y-4">
                             <div className="p-4 bg-[#fdfaf3] rounded-xl border border-[#dcd0b9]">
                                <p className="text-[10px] font-black uppercase text-[#8c7851] mb-1">Top Spend Intensity</p>
                                <p className="text-sm font-black text-[#062c1a] serif italic">{barData[0]?.name || 'N/A'}</p>
                             </div>
                             <div className="p-4 bg-[#fdfaf3] rounded-xl border border-[#dcd0b9]">
                                <p className="text-[10px] font-black uppercase text-[#8c7851] mb-1">Habit Risk</p>
                                <p className="text-sm font-black text-red-900 serif italic">Subscription Bloat Detected</p>
                             </div>
                          </div>
                       </div>

                       <div className="bg-[#062c1a] p-10 rounded-3xl text-white shadow-2xl">
                          <h4 className="text-[10px] font-black text-[#c5a059] uppercase tracking-widest mb-6">The Habit Tax</h4>
                          <div className="space-y-6">
                             <div>
                                <p className="text-xs font-bold text-emerald-100/60 mb-2">If you cook 2x more/week:</p>
                                <p className="text-2xl font-black serif italic text-[#c5a059]">+$1,200/Year</p>
                             </div>
                             <div>
                                <p className="text-xs font-bold text-emerald-100/60 mb-2">If you skip 1 coffee/week:</p>
                                <p className="text-2xl font-black serif italic text-[#c5a059]">+$240/Year</p>
                             </div>
                             <hr className="border-emerald-900" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]/60">10 Year Impact (7% APY)</p>
                             <p className="text-3xl font-black serif text-white">$21,480</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'budgets' && (
                <div className="max-w-6xl mx-auto space-y-12">
                  <div className="bg-[#062c1a] p-16 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
                    <div className="relative z-10">
                       <h3 className="text-5xl font-black serif italic text-[#c5a059] mb-4">The Budget Office</h3>
                       <p className="text-emerald-100/60 font-medium tracking-wide max-w-md">Assign specific limits to your monthly spending classifications.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {spendingCategories.map((cat) => {
                      const limit = budgets[cat] || 0, spent = currentMonthSpending[cat] || 0, ratio = limit > 0 ? (spent / limit) : 0;
                      return (
                        <div key={cat} className="bg-white p-8 rounded-3xl card-shadow border border-[#dcd0b9] group hover:border-[#c5a059] transition-all">
                          <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-[#fdfaf3] border border-[#dcd0b9] flex items-center justify-center text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-white transition-all">
                              <i className={`fas ${CATEGORY_ICONS[cat] || 'fa-tag'}`}></i>
                            </div>
                            <h4 className="font-black text-[#062c1a] serif italic">{cat}</h4>
                          </div>
                          <div className="flex justify-between items-end mb-6">
                             <div>
                               <p className="text-[10px] font-black uppercase text-[#8c7851] tracking-widest mb-1">Spent</p>
                               <p className="text-2xl font-black">${spent.toLocaleString()}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] font-black uppercase text-[#8c7851] tracking-widest mb-1">Limit</p>
                               <input type="number" className="w-24 bg-[#fdfaf3] border-b-2 border-[#dcd0b9] text-right font-black p-1 focus:border-[#c5a059] outline-none" value={limit || ''} placeholder="Set Limit" onChange={(e) => updateBudget(cat, parseFloat(e.target.value) || 0)} />
                             </div>
                          </div>
                          <div className="h-2 w-full bg-[#fdfaf3] rounded-full overflow-hidden border border-[#dcd0b9]">
                             <div className={`h-full transition-all duration-700 ${ratio > 1 ? 'bg-[#2d1810]' : ratio > 0.8 ? 'bg-[#c5a059]' : 'bg-[#062c1a]'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="max-w-6xl mx-auto space-y-8">
                  <div className="bg-white p-8 rounded-2xl card-shadow border border-[#dcd0b9] flex flex-wrap items-center gap-6">
                     <div className="relative flex-grow min-w-[300px]">
                        <i className="fas fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-[#dcd0b9]"></i>
                        <input type="text" placeholder="Search..." className="w-full bg-[#fdfaf3] border-2 border-[#dcd0b9] rounded-lg py-5 pl-16 pr-8 text-sm font-bold focus:border-[#c5a059] outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     </div>
                     <select className="bg-[#fdfaf3] border-2 border-[#dcd0b9] rounded-lg py-5 px-10 text-sm font-bold outline-none cursor-pointer focus:border-[#c5a059] transition-all" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        <option value="all">All Categories</option>
                        {categoriesAvailable.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <button onClick={clearFilters} className="w-12 h-12 rounded-lg bg-[#fdfaf3] border-2 border-[#dcd0b9] hover:bg-white flex items-center justify-center text-[#8c7851] transition-all"><i className="fas fa-xmark"></i></button>
                  </div>
                  <div className="bg-white rounded-3xl card-shadow border border-[#dcd0b9] overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-[#fdfaf3] text-[10px] font-black uppercase tracking-widest text-[#8c7851] border-b-2 border-[#dcd0b9]">
                        <tr><th className="py-10 px-12">Entity</th><th className="py-10 px-12">Category</th><th className="py-10 px-12 text-right">Amount</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[#dcd0b9]/40">
                        {filteredTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-[#fdfaf3] transition-all">
                            <td className="py-8 px-12">
                               <p className="text-sm font-black serif italic text-[#062c1a] mb-1">{t.merchantName || t.description}</p>
                               <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-wider">{t.date}</p>
                            </td>
                            <td className="py-8 px-12">
                               <span className="px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-widest border border-[#c5a059] text-[#062c1a]">{t.category}</span>
                            </td>
                            <td className={`py-8 px-12 text-right text-sm font-black ${t.isIncome ? 'text-green-800' : 'text-[#2d1810]'}`}>
                               ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'assistant' && (
                <div className="max-w-4xl mx-auto h-[78vh] flex flex-col bg-white rounded-3xl card-shadow border-2 border-[#dcd0b9] overflow-hidden">
                   <div className="p-10 bg-[#062c1a] text-white font-black serif text-xl italic border-b-2 border-[#dcd0b9] shadow-md">The Teller's Desk</div>
                   <div className="flex-grow overflow-y-auto p-12 space-y-10 custom-scrollbar bg-[#fdfaf3]/50">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[75%] p-8 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#2d1810] text-white font-bold shadow-xl' : 'bg-white border-2 border-[#dcd0b9] shadow-sm'}`}>
                              {msg.content}
                           </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start"><div className="bg-white p-8 rounded-2xl border-2 border-[#dcd0b9] shadow-sm animate-pulse">Consulting files...</div></div>
                      )}
                      <div ref={chatEndRef} />
                   </div>
                   <form onSubmit={handleChat} className="p-10 bg-white border-t-2 border-[#dcd0b9]">
                      <div className="relative">
                        <input type="text" placeholder="Speak to the teller..." className="w-full bg-[#fdfaf3] border-2 border-[#dcd0b9] rounded-xl py-6 pl-10 pr-40 text-sm font-bold focus:border-[#c5a059] outline-none" value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                        <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 brass-button text-white px-10 py-4 rounded-lg text-[10px] font-black uppercase tracking-widest">Inquire</button>
                      </div>
                   </form>
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
      `}</style>
    </div>
  );
};

export default App;
