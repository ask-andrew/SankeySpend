
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, SpendingInsight, SankeyData } from './types';
import { categorizeTransactions, getSpendingInsights } from './services/geminiService';
import SankeyChart from './components/SankeyChart';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const DEFAULT_CATEGORIES = ["Food", "Housing", "Transport", "Shopping", "Entertainment", "Utilities", "Income", "Health", "Finance", "Education", "Travel", "Business", "Uncategorized"];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#475569'];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('sankeyspend_txs');
    return saved ? JSON.parse(saved) : [];
  });
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('sankeyspend_cats');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNeedsReviewOnly, setShowNeedsReviewOnly] = useState(false);

  useEffect(() => {
    localStorage.setItem('sankeyspend_txs', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('sankeyspend_cats', JSON.stringify(customCategories));
  }, [customCategories]);

  const parseNumber = (val: string | number | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    let cleaned = val.replace(/[$,]/g, '').trim();
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    return parseFloat(cleaned) || 0;
  };

  const processFile = (file: File): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            return resolve([]);
          }

          const headers = results.meta.fields || [];
          const findIdx = (regex: RegExp) => headers.find(h => regex.test(h));

          const dateHeader = findIdx(/date/i);
          const descHeader = findIdx(/desc|memo|payee|merchant|details|narrative/i);
          const amtHeader = findIdx(/amount|total|value|sum/i);
          const debitHeader = findIdx(/debit|withdraw/i);
          const creditHeader = findIdx(/credit|deposit/i);

          if (!dateHeader || (!amtHeader && !debitHeader && !creditHeader)) {
            console.error("Missing required headers in CSV:", headers);
            return resolve([]);
          }

          const parsed: Transaction[] = (results.data as any[]).map((row, idx) => {
            let amount = 0;
            let isIncome = false;

            if (amtHeader) {
              amount = parseNumber(row[amtHeader]);
              isIncome = amount > 0;
              amount = Math.abs(amount);
            } else {
              const debit = Math.abs(parseNumber(row[debitHeader!]));
              const credit = Math.abs(parseNumber(row[creditHeader!]));
              if (credit > 0) {
                amount = credit;
                isIncome = true;
              } else {
                amount = debit;
                isIncome = false;
              }
            }

            return {
              id: `${file.name}-${idx}-${Date.now()}`,
              date: row[dateHeader] || '',
              description: row[descHeader!] || 'Unknown Merchant',
              amount,
              category: 'Processing...',
              subCategory: 'Other',
              isIncome,
              source: file.name
            };
          }).filter(t => t.amount !== 0 && t.date !== '');

          resolve(parsed);
        },
        error: (err) => {
          console.error("PapaParse error:", err);
          reject(err);
        }
      });
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      let allNewTransactions: Transaction[] = [];
      const newFileNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsed = await processFile(file);
        if (parsed.length > 0) {
          allNewTransactions = [...allNewTransactions, ...parsed];
          newFileNames.push(file.name);
        } else {
          setError(`File "${file.name}" ignored: Could not find required columns (Date, Amount/Debit/Credit).`);
        }
      }

      if (allNewTransactions.length === 0) {
        setIsProcessing(false);
        return;
      }

      setTransactions(prev => {
        const next = [...prev, ...allNewTransactions];
        return next;
      });
      setUploadedFiles(prev => [...prev, ...newFileNames]);

      // Trigger AI enrichment in background but wait for it for smoother UX if first upload
      const categorizedResults = await categorizeTransactions(allNewTransactions);
      
      setTransactions(current => current.map(t => {
        const aiMatch = categorizedResults.find(c => c.id === t.id);
        if (t.category === 'Processing...') {
          return { 
            ...t, 
            merchantName: aiMatch?.merchant || t.description,
            category: aiMatch?.category || 'Uncategorized', 
            subCategory: aiMatch?.subCategory || 'Other' 
          };
        }
        return t;
      }));

      const newInsights = await getSpendingInsights([...transactions, ...allNewTransactions]);
      setInsights(newInsights);
    } catch (err) {
      console.error(err);
      setError("AI analysis encountered an error. Data was imported but categorization may be incomplete.");
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const loadSampleData = async () => {
    setIsProcessing(true);
    const sample = [
      { id: 's1', date: '2024-05-01', description: 'STARBUCKS #9921 SEA', amount: 5.50, category: 'Food', subCategory: 'Coffee', isIncome: false, source: 'Sample.csv', merchantName: 'Starbucks' },
      { id: 's2', date: '2024-05-02', description: 'AMZN MKTPLACE US', amount: 89.99, category: 'Shopping', subCategory: 'Electronics', isIncome: false, source: 'Sample.csv', merchantName: 'Amazon' },
      { id: 's3', date: '2024-05-05', description: 'PAYROLL DEPOSIT ACME', amount: 3500.00, category: 'Income', subCategory: 'Salary', isIncome: true, source: 'Sample.csv', merchantName: 'Acme Corp' },
      { id: 's4', date: '2024-05-10', description: 'SHELL OIL 4421', amount: 45.00, category: 'Transport', subCategory: 'Gas', isIncome: false, source: 'Sample.csv', merchantName: 'Shell' },
      { id: 's5', date: '2024-05-15', description: 'NETFLIX.COM', amount: 15.99, category: 'Entertainment', subCategory: 'Streaming', isIncome: false, source: 'Sample.csv', merchantName: 'Netflix' }
    ];
    setTransactions(sample);
    setInsights([
      { title: "Healthy Surplus", description: "You are spending significantly less than your salary this month.", type: "positive" },
      { title: "Subscription Check", description: "Streaming services like Netflix are appearing regularly.", type: "info" }
    ]);
    setIsProcessing(false);
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const csvData = transactions.map(t => ({
      Date: t.date,
      Description: t.description,
      Merchant: t.merchantName || "",
      Amount: t.amount,
      Category: t.category,
      SubCategory: t.subCategory || "",
      IsIncome: t.isIncome,
      Source: t.source
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sankeyspend_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateCategory = (id: string, newCategory: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
  };

  const bulkUpdateCategory = (newCategory: string) => {
    setTransactions(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, category: newCategory } : t));
    setSelectedIds(new Set());
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      setTransactions([]);
      setUploadedFiles([]);
      setInsights([]);
      setSelectedIds(new Set());
      localStorage.removeItem('sankeyspend_txs');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesMonth = filterMonth === 'all' || 
        `${new Date(t.date).getFullYear()}-${(new Date(t.date).getMonth() + 1).toString().padStart(2, '0')}` === filterMonth;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (t.merchantName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === 'all' || t.subCategory === selectedSubCategory;
      const matchesReviewFilter = !showNeedsReviewOnly || t.category === 'Uncategorized' || t.category === 'Processing...';
      return matchesMonth && matchesSearch && matchesCategory && matchesSubCategory && matchesReviewFilter;
    });
  }, [transactions, filterMonth, searchTerm, selectedCategory, selectedSubCategory, showNeedsReviewOnly]);

  const subCategoriesList = useMemo(() => {
    const subs = new Set<string>();
    transactions.forEach(t => {
      if ((selectedCategory === 'all' || t.category === selectedCategory) && t.subCategory) {
        subs.add(t.subCategory);
      }
    });
    return Array.from(subs).sort();
  }, [transactions, selectedCategory]);

  const months = useMemo(() => {
    const mSet = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) mSet.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    });
    return Array.from(mSet).sort().reverse();
  }, [transactions]);

  const totals = useMemo(() => {
    const expenses = filteredTransactions.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    const income = filteredTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    return { expenses, income };
  }, [filteredTransactions]);

  const sankeyData = useMemo((): SankeyData => {
    const chartBaseTransactions = transactions.filter(t => filterMonth === 'all' || `${new Date(t.date).getFullYear()}-${(new Date(t.date).getMonth() + 1).toString().padStart(2, '0')}` === filterMonth);
    if (chartBaseTransactions.length === 0) return { nodes: [], links: [] };
    const nodesMap = new Map<string, number>();
    const links: { source: number; target: number; value: number }[] = [];
    const getNode = (name: string) => {
      if (!nodesMap.has(name)) nodesMap.set(name, nodesMap.size);
      return nodesMap.get(name)!;
    };
    const rootNode = getNode("My Wallet");
    const income = chartBaseTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    const expenses = chartBaseTransactions.filter(t => !t.isIncome);
    if (income > 0) links.push({ source: getNode("Income Stream"), target: rootNode, value: income });
    const catTotals = new Map<string, number>();
    expenses.forEach(t => catTotals.set(t.category, (catTotals.get(t.category) || 0) + t.amount));
    catTotals.forEach((val, cat) => {
      const catNode = getNode(cat);
      links.push({ source: rootNode, target: catNode, value: val });
      const subTotals = new Map<string, number>();
      expenses.filter(t => t.category === cat).forEach(t => {
        const sub = t.subCategory || 'Other';
        subTotals.set(sub, (subTotals.get(sub) || 0) + t.amount);
      });
      subTotals.forEach((subVal, sub) => links.push({ source: catNode, target: getNode(`${cat}: ${sub}`), value: subVal }));
    });
    return { nodes: Array.from(nodesMap.entries()).map(([name]) => ({ name, id: name })), links };
  }, [transactions, filterMonth]);

  const barData = useMemo(() => {
    const cats = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome).forEach(t => cats.set(t.category, (cats.get(t.category) || 0) + t.amount));
    return Array.from(cats.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const handleNodeClick = (name: string) => {
    if (name === "My Wallet") { setSelectedCategory('all'); setSelectedSubCategory('all'); }
    else if (name === "Income Stream") { setSelectedCategory('Income'); setSelectedSubCategory('all'); }
    else if (name.includes(': ')) {
       const [cat, sub] = name.split(': ');
       setSelectedCategory(cat); setSelectedSubCategory(sub);
    } else { setSelectedCategory(name); setSelectedSubCategory('all'); }
  };

  return (
    <div className="min-h-screen pb-32 bg-[#f8fafc] text-slate-900 font-inter">
      <header className="bg-white/90 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-100">
              <i className="fas fa-fingerprint text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">SankeySpend</h1>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Privacy-First Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {transactions.length > 0 && (
              <button onClick={exportToCSV} className="text-indigo-600 hover:text-indigo-800 text-[11px] font-black uppercase tracking-wider px-3 border border-indigo-100 rounded-lg py-2 transition-all">
                <i className="fas fa-file-export mr-2"></i>Export CSV
              </button>
            )}
            <label className="cursor-pointer bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95">
              <i className="fas fa-plus-circle"></i> Add Data
              <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} disabled={isProcessing} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-exclamation-triangle"></i>
              <span className="text-sm font-bold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600"><i className="fas fa-times"></i></button>
          </div>
        )}

        {transactions.length === 0 && !isProcessing && (
          <div className="max-w-3xl mx-auto text-center py-32">
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold mb-8">
               <i className="fas fa-shield-alt"></i> No data ever leaves your device
             </div>
             <h2 className="text-5xl font-black mb-6 tracking-tight">Visualize your financial flow.</h2>
             <p className="text-slate-500 mb-12 text-xl leading-relaxed max-w-2xl mx-auto">
               Securely analyze bank statements without sharing passwords. 
               We use Gemini AI to clean merchant names and categorize expenses locally.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-indigo-200 flex items-center gap-3 text-lg">
                  <i className="fas fa-cloud-upload-alt"></i> Upload CSV Statements
                  <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} />
                </label>
                <button onClick={loadSampleData} className="px-10 py-5 rounded-2xl font-black text-slate-600 hover:bg-slate-100 transition-all border border-slate-200">
                  Try Sample Data
                </button>
             </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-2xl font-black tracking-tight">Processing your data...</h3>
            <p className="text-slate-400 mt-2 font-medium">Extracting columns and categorizing with AI</p>
          </div>
        )}

        {transactions.length > 0 && !isProcessing && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI & Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
               <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl flex flex-col justify-between">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Net Outflow</p>
                  <h2 className="text-4xl font-black mt-2">${totals.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                    <i className="fas fa-plus-circle"></i> ${totals.income.toLocaleString()} Income
                  </div>
               </div>
               {insights.map((insight, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group">
                    <div className="flex items-center gap-3 mb-3">
                       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm ${insight.type === 'positive' ? 'bg-emerald-50 text-emerald-600' : insight.type === 'warning' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          <i className={`fas ${insight.type === 'positive' ? 'fa-check-circle' : insight.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-lightbulb'}`}></i>
                       </div>
                       <h5 className="font-black text-slate-900 text-sm">{insight.title}</h5>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 group-hover:line-clamp-none">{insight.description}</p>
                 </div>
               ))}
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex bg-slate-50 p-1.5 rounded-2xl">
                   <button onClick={() => setFilterMonth('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterMonth === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>All Time</button>
                   {months.slice(0, 5).map(m => (
                     <button key={m} onClick={() => setFilterMonth(m)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterMonth === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                       {new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })}
                     </button>
                   ))}
                </div>
                <div className="flex-grow flex items-center gap-3">
                   <select 
                      className="bg-slate-50 border-none rounded-2xl text-[12px] font-bold py-2.5 px-4 outline-none appearance-none cursor-pointer text-slate-700 focus:ring-2 focus:ring-indigo-100"
                      value={selectedCategory}
                      onChange={(e) => {setSelectedCategory(e.target.value); setSelectedSubCategory('all');}}
                   >
                      <option value="all">Categories</option>
                      {customCategories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <input 
                      type="text" 
                      placeholder="Search transactions..." 
                      className="flex-grow bg-slate-50 border-none rounded-2xl text-[12px] font-bold py-2.5 px-6 outline-none focus:ring-2 focus:ring-indigo-100"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                <button onClick={() => setShowNeedsReviewOnly(!showNeedsReviewOnly)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase transition-all border ${showNeedsReviewOnly ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-500'}`}>Review Flags</button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
               {/* Sankey Column */}
               <div className="xl:col-span-8 space-y-8">
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                     <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black tracking-tight">Financial Flow</h3>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Data Visualizer
                        </div>
                     </div>
                     <SankeyChart data={sankeyData} height={500} onNodeClick={handleNodeClick} />
                  </div>
                  
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black tracking-tight">Transaction Log</h3>
                        <div className="flex items-center gap-3">
                           <button onClick={clearAll} className="text-slate-300 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50"><i className="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-50">
                          <tr>
                            <th className="pb-4 px-4 w-10"><input type="checkbox" className="rounded" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredTransactions.map(tx => tx.id)) : new Set())} checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0} /></th>
                            <th className="pb-4 px-4">Merchant & Details</th>
                            <th className="pb-4 px-4">Category</th>
                            <th className="pb-4 px-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredTransactions.map(t => (
                            <tr key={t.id} className={`group hover:bg-slate-50/50 transition-colors ${selectedIds.has(t.id) ? 'bg-indigo-50/30' : ''}`}>
                              <td className="py-5 px-4">
                                <input type="checkbox" className="rounded" checked={selectedIds.has(t.id)} onChange={() => {
                                   const next = new Set(selectedIds);
                                   if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                                   setSelectedIds(next);
                                }} />
                              </td>
                              <td className="py-5 px-4 max-w-[280px]">
                                <p className={`text-sm font-black truncate ${t.category === 'Uncategorized' || t.category === 'Processing...' ? 'text-amber-700' : 'text-slate-900'}`}>{t.merchantName || t.description}</p>
                                <p className="text-[9px] text-slate-300 font-bold uppercase truncate">{t.date} • {t.source}</p>
                              </td>
                              <td className="py-5 px-4">
                                <select 
                                   className={`text-[10px] font-black px-3 py-1.5 rounded-lg border outline-none transition-all ${t.category === 'Uncategorized' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white text-indigo-600 border-slate-100 hover:border-indigo-200 shadow-sm'}`}
                                   value={t.category}
                                   onChange={(e) => updateCategory(t.id, e.target.value)}
                                >
                                   {customCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </td>
                              <td className={`py-5 px-4 text-right text-sm font-black ${t.isIncome ? 'text-emerald-500' : 'text-slate-900'}`}>
                                {t.isIncome ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
               </div>

               {/* Right Side Sidebar */}
               <div className="xl:col-span-4 space-y-8">
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                     <h3 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-widest">Category Distribution</h3>
                     <div className="h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 900 }} stroke="#94a3b8" />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={16}>
                              {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                     <div className="relative z-10">
                        <h4 className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-6">Security Check</h4>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center text-sm font-bold">
                              <span>Local Analysis</span>
                              <span className="text-emerald-300"><i className="fas fa-check-circle mr-2"></i>Active</span>
                           </div>
                           <div className="flex justify-between items-center text-sm font-bold">
                              <span>Cloud Upload</span>
                              <span className="text-rose-300"><i className="fas fa-times-circle mr-2"></i>Disabled</span>
                           </div>
                        </div>
                        <p className="mt-8 text-[9px] font-bold opacity-50 leading-relaxed uppercase tracking-widest text-center">
                          Powered by Client-Side Gemini Flash
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Bulk Edit Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 border border-white/10 animate-in slide-in-from-bottom-5 duration-300">
           <div className="flex items-center gap-3 pr-8 border-r border-white/10">
              <span className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-black">{selectedIds.size}</span>
              <p className="text-sm font-bold">Items Selected</p>
           </div>
           <select 
              className="bg-slate-800 border-none rounded-xl text-xs font-bold py-2 px-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
              onChange={(e) => {
                 if (e.target.value) bulkUpdateCategory(e.target.value);
              }}
              value=""
           >
              <option value="" disabled>Change Category to...</option>
              {customCategories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-slate-400 hover:text-white transition-colors">Dismiss</button>
        </div>
      )}
    </div>
  );
};

export default App;
