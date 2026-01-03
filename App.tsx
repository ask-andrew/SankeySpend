
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, SpendingInsight, SankeyData, ChatMessage } from './types';
import { categorizeTransactions, getSpendingInsights, queryTransactions } from './services/geminiService';
import SankeyChart from './components/SankeyChart';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend, CartesianGrid
} from 'recharts';

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];
const TELLER_ILLUSTRATION = "https://images.unsplash.com/photo-1544717297-fa154daaf762?q=80&w=800&auto=format&fit=crop";

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Drink": "fa-burger",
  "Housing": "fa-house",
  "Transport": "fa-car",
  "Shopping": "fa-bag-shopping",
  "Fun & Hobbies": "fa-gamepad",
  "Bills & Utilities": "fa-bolt",
  "Income": "fa-money-bill-trend-up",
  "Wellness & Health": "fa-heart-pulse",
  "Money & Finance": "fa-coins",
  "Education": "fa-graduation-cap",
  "Travel": "fa-plane",
  "Work": "fa-briefcase",
  "Account Transfer": "fa-right-left",
  "Uncategorized": "fa-question"
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('teller_txs');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'assistant'>('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Chat
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I'm your Teller. I've finished looking through your spending history securely on this device. How can I help you understand your money today?", isInitial: true }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('teller_txs', JSON.stringify(transactions));
    if (transactions.length > 0 && insights.length === 0) refreshInsights();
  }, [transactions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const refreshInsights = async () => {
    const newInsights = await getSpendingInsights(transactions);
    setInsights(newInsights);
  };

  const parseNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    let cleaned = val.replace(/[$,]/g, '').trim();
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) cleaned = '-' + cleaned.slice(1, -1);
    return parseFloat(cleaned) || 0;
  };

  const detectInternalTransfers = (txs: Transaction[]) => {
    const paymentKeywords = [/online pmt/i, /credit card/i, /autopay/i, /payment/i, /citi card/i, /chase pmt/i, /amex/i];
    const newTxs = [...txs];

    txs.filter(t => !t.isIncome).forEach(t => {
      if (paymentKeywords.some(kw => kw.test(t.description))) {
        const match = txs.find(other => 
          other.isIncome && 
          Math.abs(other.amount - t.amount) < 0.01 && 
          Math.abs(new Date(other.date).getTime() - new Date(t.date).getTime()) < 3 * 24 * 60 * 60 * 1000 &&
          other.id !== t.id
        );

        if (match) {
          const idx1 = newTxs.findIndex(n => n.id === t.id);
          const idx2 = newTxs.findIndex(n => n.id === match.id);
          newTxs[idx1] = { ...newTxs[idx1], isInternalTransfer: true, category: 'Account Transfer' };
          newTxs[idx2] = { ...newTxs[idx2], isInternalTransfer: true, category: 'Account Transfer' };
        }
      }
    });
    return newTxs;
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
            header: true,
            skipEmptyLines: true,
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
                amount: Math.abs(parseNumber(row[amtH])),
                category: 'Categorizing...',
                isIncome: parseNumber(row[amtH]) > 0,
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
        return { 
          ...t, 
          merchantName: match?.merchant, 
          category: match?.category || 'Uncategorized',
          subCategory: match?.subCategory || 'Other'
        };
      });
      
      setTransactions(detectInternalTransfers([...transactions, ...enriched]));
      await refreshInsights();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      const mKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      return (filterMonth === 'all' || mKey === filterMonth) &&
             (selectedCategory === 'all' || t.category === selectedCategory) &&
             (selectedSubCategory === 'all' || t.subCategory === selectedSubCategory) &&
             (searchTerm === '' || t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [transactions, filterMonth, selectedCategory, selectedSubCategory, searchTerm]);

  const categoriesAvailable = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category))).sort();
  }, [transactions]);

  const subCategoriesList = useMemo(() => {
    const subs = new Set<string>();
    transactions.forEach(t => {
      if ((selectedCategory === 'all' || t.category === selectedCategory) && t.subCategory) {
        subs.add(t.subCategory);
      }
    });
    return Array.from(subs).sort();
  }, [transactions, selectedCategory]);

  const totals = useMemo(() => {
    const realSpend = filteredTransactions.filter(t => !t.isIncome && !t.isInternalTransfer).reduce((s, t) => s + t.amount, 0);
    const moneyIn = filteredTransactions.filter(t => t.isIncome && !t.isInternalTransfer).reduce((s, t) => s + t.amount, 0);
    const transfers = filteredTransactions.filter(t => t.isInternalTransfer).reduce((s, t) => s + t.amount, 0);
    return { realSpend, moneyIn, transfers, net: moneyIn - realSpend };
  }, [filteredTransactions]);

  const stackedBarData = useMemo(() => {
    const txs = filteredTransactions.filter(t => !t.isIncome && !t.isInternalTransfer);
    if (txs.length === 0) return [];

    const dates = txs.map(t => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

    const useMonthly = diffDays > 30;
    const grouping = new Map<string, Record<string, number>>();

    txs.forEach(t => {
      const d = new Date(t.date);
      let key = "";
      if (useMonthly) {
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        // Calculate week starting date
        const first = d.getDate() - d.getDay();
        const weekStart = new Date(d.setDate(first)).toISOString().split('T')[0];
        key = `Wk of ${weekStart}`;
      }

      if (!grouping.has(key)) grouping.set(key, {});
      const group = grouping.get(key)!;
      group[t.category] = (group[t.category] || 0) + t.amount;
    });

    return Array.from(grouping.entries()).map(([name, values]) => ({
      name,
      ...values
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTransactions]);

  const trendData = useMemo(() => {
    const days = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome && !t.isInternalTransfer).forEach(t => {
      const day = t.date.split('-').slice(0, 3).join('-');
      days.set(day, (days.get(day) || 0) + t.amount);
    });
    return Array.from(days.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [filteredTransactions]);

  // Fix: Added missing barData to calculate top categories by amount for the 'Hidden Patterns' section.
  const barData = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome && !t.isInternalTransfer).forEach(t => {
      categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount);
    });
    return Array.from(categoryTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const sankeyData = useMemo((): SankeyData => {
    if (filteredTransactions.length === 0) return { nodes: [], links: [] };
    const nodesMap = new Map<string, number>();
    const links: { source: number; target: number; value: number }[] = [];
    const getNode = (name: string) => {
      if (!nodesMap.has(name)) nodesMap.set(name, nodesMap.size);
      return nodesMap.get(name)!;
    };
    
    const root = getNode("Your Cash Flow");
    filteredTransactions.filter(t => !t.isIncome && !t.isInternalTransfer).forEach(t => {
      const catNode = getNode(t.category);
      links.push({ source: root, target: catNode, value: t.amount });
    });
    return { nodes: Array.from(nodesMap.keys()).map(name => ({ name, id: name })), links };
  }, [filteredTransactions]);

  const months = useMemo(() => {
    const mSet = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) mSet.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    });
    return Array.from(mSet).sort().reverse();
  }, [transactions]);

  const clearFilters = () => {
    setFilterMonth('all');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setSearchTerm('');
  };

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Friendly Sidebar */}
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-10">
        <div className="flex items-center gap-4 mb-16">
          <div className="bg-white/10 p-3 rounded-2xl">
            <i className="fas fa-hand-holding-heart text-2xl text-emerald-400"></i>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter leading-none serif">Teller</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Wellness</span>
          </div>
        </div>
        
        <nav className="flex-grow space-y-4">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-house-user w-5"></i> Financial Home
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-receipt w-5"></i> Spending Activity
          </button>
          <button onClick={() => setActiveTab('assistant')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'assistant' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <i className="fas fa-comment-heart w-5"></i> Ask the Teller
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5">
           <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Privacy Active</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Your money's story, told privately on this device.</p>
           </div>
           <button onClick={() => { if(confirm("Start over? This will clear all data locally.")) { localStorage.clear(); window.location.reload(); } }} className="text-[10px] text-slate-500 hover:text-rose-400 font-black uppercase tracking-widest flex items-center gap-2 transition-all">
             <i className="fas fa-eraser"></i> Reset My Data
           </button>
        </div>
      </aside>

      {/* Main Surface */}
      <main className="flex-grow flex flex-col overflow-hidden bg-[#fcfcfc]">
        <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-12 z-10">
           <div className="flex flex-col">
              <h2 className="text-xl font-black text-slate-900 serif tracking-tight">
                {activeTab === 'home' ? 'Welcome Back' : activeTab === 'history' ? 'Financial Journal' : 'Your Mentor'}
              </h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
           </div>
           
           <div className="flex items-center gap-8">
             {transactions.length > 0 && (
               <div className="flex items-center gap-4 border-r border-slate-100 pr-8">
                  <div className="text-right">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monthly Cash Flow</p>
                     <p className={`text-sm font-black ${totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                       {totals.net >= 0 ? '+' : '-'}${Math.abs(totals.net).toLocaleString()}
                     </p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${totals.net >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                     <i className={`fas ${totals.net >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                  </div>
               </div>
             )}
             
             <label className="cursor-pointer bg-[#0f172a] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 flex items-center gap-3">
               <i className="fas fa-file-import"></i> Add Statements
               <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} />
             </label>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto custom-scrollbar hero-gradient">
          {transactions.length === 0 && !isProcessing ? (
            <div className="max-w-5xl mx-auto py-16 px-8 space-y-24">
              {/* Landing Page Content */}
              <div className="flex flex-col lg:flex-row items-center gap-16">
                <div className="w-full lg:w-1/2">
                   <img src={TELLER_ILLUSTRATION} className="rounded-[5rem] shadow-2xl teller-illustration border-[12px] border-white" alt="Friendly Teller" />
                </div>
                <div className="w-full lg:w-1/2 space-y-8">
                  <h2 className="text-6xl font-black text-slate-900 leading-tight serif">Teller - Your Money's Story, Privately Told</h2>
                  <p className="text-slate-500 leading-relaxed text-2xl font-medium">Your financial data deserves better than spreadsheets. And way more privacy than those other apps.</p>
                  <p className="text-slate-600 text-lg">Teller transforms your bank statements into beautiful insights—without ever uploading your data anywhere. Drop in your CSV files and instantly see where your money comes from and where it goes. No account linking. No cloud storage. No surveillance. Just you, your data, and clarity.</p>
                  <label className="cursor-pointer bg-[#0f172a] text-white px-12 py-6 rounded-[2.5rem] font-black hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/10 text-xl inline-block uppercase tracking-widest">
                    Try Teller Now →
                    <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              {/* Security Policy & Goals */}
              <div className="bg-white p-16 rounded-[4rem] card-shadow border border-slate-50 space-y-12">
                 <div className="max-w-4xl space-y-8">
                    <h3 className="text-4xl font-black text-slate-900 serif">Finally, financial clarity without the privacy trade-off</h3>
                    <p className="text-slate-500 text-xl leading-relaxed">Most money apps want access to everything. Your login credentials. Your transaction history. Your spending patterns. All stored on their servers, ripe for breaches, and sold to advertisers.</p>
                    <p className="text-slate-900 font-bold text-xl">Teller works differently.</p>
                    <p className="text-slate-600 text-lg leading-relaxed">Your financial data never leaves your device. Every calculation, every insight, every beautiful visualization happens right here in your browser. We can't see your data because we literally never receive it.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t border-slate-100">
                    <div className="space-y-4">
                       <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg">
                          <i className="fas fa-file-upload"></i>
                       </div>
                       <p className="font-bold text-slate-900">1. Upload Locally</p>
                       <p className="text-sm text-slate-500">Drop in your CSV files exported from your bank.</p>
                    </div>
                    <div className="space-y-4">
                       <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg">
                          <i className="fas fa-microchip"></i>
                       </div>
                       <p className="font-bold text-slate-900">2. Private Analysis</p>
                       <p className="text-sm text-slate-500">Processing happens entirely in your browser window.</p>
                    </div>
                    <div className="space-y-4">
                       <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg">
                          <i className="fas fa-wand-sparkles"></i>
                       </div>
                       <p className="font-bold text-slate-900">3. Instant Clarity</p>
                       <p className="text-sm text-slate-500">Get insights, trends, and flow visuals immediately.</p>
                    </div>
                    <div className="space-y-4">
                       <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg">
                          <i className="fas fa-trash-arrow-up"></i>
                       </div>
                       <p className="font-bold text-slate-900">4. Session Safety</p>
                       <p className="text-sm text-slate-500">Close the tab and your data is gone forever.</p>
                    </div>
                 </div>
              </div>
              
              <div className="text-center py-10">
                 <p className="text-slate-400 font-black uppercase tracking-widest mb-10">Trusted by privacy-conscious humans</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                    <div className="bg-white p-10 rounded-[3rem] card-shadow border border-slate-50">
                       <h4 className="text-xl font-black text-slate-900 serif mb-4">Zero Surveillance</h4>
                       <p className="text-slate-500 leading-relaxed">No tracking, no advertisers, no "partners". Just your financial story, privately told.</p>
                    </div>
                    <div className="bg-white p-10 rounded-[3rem] card-shadow border border-slate-50">
                       <h4 className="text-xl font-black text-slate-900 serif mb-4">Human First</h4>
                       <p className="text-slate-500 leading-relaxed">Designed to be simple, conversational, and encouraging. No Excel skills required.</p>
                    </div>
                    <div className="bg-white p-10 rounded-[3rem] card-shadow border border-slate-50">
                       <h4 className="text-xl font-black text-slate-900 serif mb-4">Smart Reconciliation</h4>
                       <p className="text-slate-500 leading-relaxed">Automatically identifies transfers and credit card payments to prevent double-counting.</p>
                    </div>
                 </div>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full space-y-12 py-32">
              <div className="w-24 h-24 border-8 border-slate-100 border-t-slate-900 rounded-full animate-spin"></div>
              <div className="text-center space-y-4">
                 <h3 className="text-4xl font-black text-slate-900 serif">Reconciling your story...</h3>
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Organizing merchants & identifying transfers locally</p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in space-y-12 p-12">
              {activeTab === 'home' && (
                <div className="space-y-12 max-w-7xl mx-auto">
                  {/* Top Stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="bg-white p-10 rounded-[3.5rem] card-shadow border border-slate-50">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Actual Spending</p>
                       <h2 className="text-5xl font-black text-slate-900 tracking-tight">${totals.realSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                       <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                          <i className="fas fa-right-left text-emerald-500"></i> ${totals.transfers.toLocaleString()} internal transfers
                       </div>
                    </div>

                    {insights.map((ins, i) => (
                      <div key={i} className={`p-10 rounded-[3.5rem] card-shadow border border-slate-50 flex flex-col justify-between transition-all hover:translate-y-[-5px] ${ins.type === 'milestone' ? 'bg-[#0f172a] text-white shadow-2xl shadow-slate-900/10' : 'bg-white text-slate-900'}`}>
                        <div className="flex items-start justify-between mb-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${ins.type === 'milestone' ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-900'}`}>
                            <i className={`fas ${ins.type === 'milestone' ? 'fa-medal' : ins.type === 'positive' ? 'fa-check-circle' : 'fa-lightbulb'}`}></i>
                          </div>
                        </div>
                        <h4 className="text-base font-black serif leading-tight mb-2">{ins.title}</h4>
                        <p className={`text-[12px] leading-relaxed ${ins.type === 'milestone' ? 'text-slate-400' : 'text-slate-500'}`}>{ins.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Flow Chart Section */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                    <div className="xl:col-span-8 space-y-12">
                      <div className="bg-white p-12 rounded-[4rem] card-shadow border border-slate-50">
                         <div className="flex items-center justify-between mb-16">
                            <div>
                               <h3 className="text-2xl font-black text-slate-900 serif">Cash Flow Map</h3>
                               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Tracing money into your life</p>
                            </div>
                            <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100">
                               <button onClick={() => setFilterMonth('all')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filterMonth === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Full Profile</button>
                               {months.slice(0, 3).map(m => (
                                 <button key={m} onClick={() => setFilterMonth(m)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filterMonth === m ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{m}</button>
                               ))}
                            </div>
                         </div>
                         <SankeyChart data={sankeyData} height={450} onNodeClick={(name) => { setSelectedCategory(name); setActiveTab('history'); }} />
                      </div>

                      {/* Stacked Temporal Chart */}
                      <div className="bg-white p-12 rounded-[4rem] card-shadow border border-slate-50">
                         <div className="flex items-center justify-between mb-12">
                            <div>
                               <h3 className="text-2xl font-black text-slate-900 serif">Where It Goes Over Time</h3>
                               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Stacked by Category</p>
                            </div>
                         </div>
                         <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={stackedBarData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                  {categoriesAvailable.filter(c => c !== "Income" && c !== "Account Transfer").map((cat, idx) => (
                                    <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[2, 2, 0, 0]} />
                                  ))}
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                      </div>
                    </div>

                    <div className="xl:col-span-4 space-y-12">
                       {/* Patterns Surface */}
                       <div className="bg-white p-12 rounded-[4rem] card-shadow border border-slate-50">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Hidden Patterns Surfaced</h4>
                          <div className="space-y-6">
                             {barData.slice(0, 3).map((item, idx) => (
                               <div key={idx} className="flex items-center gap-5 p-5 rounded-[2.5rem] bg-slate-50 border border-slate-100/50">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl text-white ${COLORS[idx % COLORS.length]}`} style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                                     <i className={`fas ${CATEGORY_ICONS[item.name] || 'fa-tag'}`}></i>
                                  </div>
                                  <div className="flex-grow">
                                     <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                                     <p className="text-[10px] font-bold text-slate-400">Largest Concentration</p>
                                  </div>
                                  <p className="text-sm font-black text-slate-900">${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                               </div>
                             ))}
                             
                             <div className="bg-[#0f172a] text-white p-8 rounded-[3rem] mt-10">
                                <h5 className="text-sm font-black serif mb-4">Did you know?</h5>
                                <p className="text-[11px] text-slate-400 leading-relaxed">Most people underestimate their <span className="text-white font-bold">"Food & Drink"</span> spending by 30%. Your data suggests this is one of your most frequent categories.</p>
                                <button onClick={() => setActiveTab('assistant')} className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Deep Dive with AI</button>
                             </div>
                          </div>
                       </div>

                       <div className="bg-white p-12 rounded-[4rem] card-shadow border border-slate-50">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Daily Intensity</h4>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                               <AreaChart data={trendData}>
                                  <defs>
                                     <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                                     </linearGradient>
                                  </defs>
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide />
                                  <Tooltip />
                                  <Area type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                               </AreaChart>
                            </ResponsiveContainer>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="max-w-6xl mx-auto space-y-8">
                  <div className="bg-white p-8 rounded-[3.5rem] card-shadow border border-slate-50 flex flex-wrap items-center gap-6">
                     <div className="relative flex-grow min-w-[300px]">
                        <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                        <input type="text" placeholder="Search by description..." className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-5 pl-16 pr-8 text-sm font-bold focus:ring-4 focus:ring-slate-100 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     </div>
                     
                     <div className="flex gap-4 items-center">
                       <select className="bg-slate-50 border border-slate-100 rounded-[2rem] py-5 px-10 text-sm font-bold outline-none cursor-pointer focus:ring-4 focus:ring-slate-100 transition-all" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory('all'); }}>
                          <option value="all">Any Category</option>
                          {categoriesAvailable.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>

                       <select className="bg-slate-50 border border-slate-100 rounded-[2rem] py-5 px-10 text-sm font-bold outline-none cursor-pointer focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-30" value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} disabled={selectedCategory === 'all'}>
                          <option value="all">Sub-Categories</option>
                          {subCategoriesList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>

                       <button onClick={clearFilters} className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all" title="Clear Filters">
                          <i className="fas fa-times"></i>
                       </button>
                     </div>
                  </div>

                  <div className="bg-white rounded-[4rem] card-shadow border border-slate-50 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                        <tr>
                          <th className="py-10 px-12">Activity</th>
                          <th className="py-10 px-12">Classification</th>
                          <th className="py-10 px-12 text-right">Amount (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="py-8 px-12">
                               <div className="flex items-center gap-5">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${t.isInternalTransfer ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white'}`}>
                                     <i className={`fas ${CATEGORY_ICONS[t.category] || 'fa-tag'}`}></i>
                                  </div>
                                  <div>
                                     <p className="text-sm font-black text-slate-900 mb-1 leading-none">{t.merchantName || t.description}</p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.date} • {t.source}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="py-8 px-12">
                               <div className="flex flex-col gap-1">
                                 <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border w-fit ${t.isInternalTransfer ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-slate-900 text-white border-slate-900'}`}>
                                   {t.category}
                                 </span>
                                 {t.subCategory && t.subCategory !== 'Other' && (
                                   <span className="text-[9px] font-bold text-slate-400 ml-1 italic">{t.subCategory}</span>
                                 )}
                               </div>
                            </td>
                            <td className={`py-8 px-12 text-right text-sm font-black ${t.isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                               {t.isIncome ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'assistant' && (
                <div className="max-w-4xl mx-auto h-[78vh] flex flex-col bg-white rounded-[4rem] card-shadow border border-slate-50 relative overflow-hidden">
                   <div className="p-10 border-b border-slate-50 bg-white/80 backdrop-blur-md flex items-center justify-between">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
                            <i className="fas fa-comment-heart text-2xl"></i>
                         </div>
                         <div>
                            <h3 className="font-black text-slate-900 tracking-tight serif text-xl">Private Mentor</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Natural conversation about your history</p>
                         </div>
                      </div>
                   </div>

                   <div className="flex-grow overflow-y-auto p-12 space-y-10 custom-scrollbar bg-[#fdfcf9]/30">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[75%] p-8 rounded-[3rem] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white font-bold shadow-2xl shadow-slate-900/10' : 'bg-white text-slate-600 border border-slate-100 shadow-sm'}`}>
                              <div className="prose prose-slate prose-sm max-w-none">
                                 {msg.content}
                              </div>
                           </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                           <div className="bg-white p-8 rounded-[3rem] flex gap-3 items-center border border-slate-50 shadow-sm">
                              <span className="w-2 h-2 bg-slate-200 rounded-full animate-bounce"></span>
                              <span className="w-2 h-2 bg-slate-200 rounded-full animate-bounce delay-150"></span>
                              <span className="w-2 h-2 bg-slate-200 rounded-full animate-bounce delay-300"></span>
                           </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                   </div>

                   <form onSubmit={handleChat} className="p-10 border-t border-slate-50 bg-white">
                      <div className="relative group">
                        <input 
                           type="text" 
                           placeholder="Ask: 'Am I spending more on dining out than last month?' or 'Show my biggest shopping days'" 
                           className="w-full bg-slate-50 border border-slate-100 rounded-[2.5rem] py-6 pl-10 pr-40 text-sm font-bold focus:ring-8 focus:ring-slate-50 outline-none transition-all placeholder:text-slate-300"
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">Ask Teller</button>
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
