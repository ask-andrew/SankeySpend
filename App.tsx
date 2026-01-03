
import React, { useState, useMemo } from 'react';
import { Transaction, SpendingInsight, SankeyData } from './types';
import { categorizeTransactions, getSpendingInsights } from './services/geminiService';
import SankeyChart from './components/SankeyChart';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CATEGORIES = ["Food", "Housing", "Transport", "Shopping", "Entertainment", "Utilities", "Income", "Health", "Finance", "Education", "Travel", "Business", "Uncategorized"];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    let cleaned = val.replace(/[$,]/g, '').trim();
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    return parseFloat(cleaned) || 0;
  };

  const processFile = (file: File): Promise<Transaction[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return resolve([]);

        const headers = lines[0].toLowerCase().split(',').map(h => h.replace(/"/g, '').trim());
        
        const dateIdx = headers.findIndex(h => h === 'date' || h === 'transaction date' || h === 'post date');
        const descIdx = headers.findIndex(h => 
          (h === 'description' || h === 'payee' || h === 'memo' || h === 'details' || h === 'name') && !h.includes('date')
        );
        const amtIdx = headers.findIndex(h => h === 'amount' || h === 'total' || h === 'value');
        const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdraw'));
        const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit'));

        const finalDateIdx = dateIdx !== -1 ? dateIdx : headers.findIndex(h => h.includes('date'));
        const finalDescIdx = descIdx !== -1 ? descIdx : headers.findIndex(h => (h.includes('desc') || h.includes('memo') || h.includes('payee')) && !h.includes('date'));
        
        const parsed: Transaction[] = lines.slice(1).map((line, idx) => {
          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/"/g, '').trim());
          
          let amount = 0;
          let isIncome = false;

          if (amtIdx !== -1) {
            amount = parseNumber(parts[amtIdx]);
            isIncome = amount > 0;
            amount = Math.abs(amount);
          } else {
            const debit = debitIdx !== -1 ? Math.abs(parseNumber(parts[debitIdx])) : 0;
            const credit = creditIdx !== -1 ? Math.abs(parseNumber(parts[creditIdx])) : 0;
            if (credit > 0) {
              amount = credit;
              isIncome = true;
            } else {
              amount = debit;
              isIncome = false;
            }
          }

          const date = finalDateIdx !== -1 ? parts[finalDateIdx] : '';
          const description = finalDescIdx !== -1 ? parts[finalDescIdx] : 'Unknown Merchant';

          const looksLikeDate = /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(description);
          const finalDescription = looksLikeDate ? `Merchant ${idx}` : (description || 'Unknown');

          return {
            id: `${file.name}-${idx}-${Date.now()}`,
            date,
            description: finalDescription,
            amount,
            category: 'Processing...',
            subCategory: 'Other',
            isIncome,
            source: file.name
          };
        }).filter(t => t.amount !== 0 && t.date !== '');

        resolve(parsed);
      };
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const newFileNames: string[] = [];
      let allNewTransactions: Transaction[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (uploadedFiles.includes(file.name)) continue; 
        newFileNames.push(file.name);
        const parsed = await processFile(file);
        allNewTransactions = [...allNewTransactions, ...parsed];
      }

      if (allNewTransactions.length === 0) {
        if (newFileNames.length > 0) setError("No valid transactions found. Please check CSV column headers.");
        setIsProcessing(false);
        return;
      }

      const merged = [...transactions, ...allNewTransactions];
      const categorizedResults = await categorizeTransactions(allNewTransactions);
      
      const enriched = merged.map(t => {
        const aiMatch = categorizedResults.find(c => c.id === t.id);
        if (t.category === 'Processing...') {
          return { 
            ...t, 
            category: aiMatch?.category || 'Uncategorized', 
            subCategory: aiMatch?.subCategory || 'Other' 
          };
        }
        return t;
      });

      setTransactions(enriched);
      setUploadedFiles(prev => [...prev, ...newFileNames]);
      const newInsights = await getSpendingInsights(enriched);
      setInsights(newInsights);
    } catch (err) {
      console.error(err);
      setError("Parsing error or AI limit reached. Check your CSV format.");
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const updateCategory = (id: string, newCategory: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
  };

  const clearAll = () => {
    setTransactions([]);
    setUploadedFiles([]);
    setInsights([]);
    setFilterMonth('all');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesMonth = filterMonth === 'all' || 
        `${new Date(t.date).getFullYear()}-${(new Date(t.date).getMonth() + 1).toString().padStart(2, '0')}` === filterMonth;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === 'all' || t.subCategory === selectedSubCategory;

      return matchesMonth && matchesSearch && matchesCategory && matchesSubCategory;
    });
  }, [transactions, filterMonth, searchTerm, selectedCategory, selectedSubCategory]);

  const subCategoriesList = useMemo(() => {
    const subs = new Set<string>();
    transactions.forEach(t => {
      if (selectedCategory === 'all' || t.category === selectedCategory) {
        if (t.subCategory) subs.add(t.subCategory);
      }
    });
    return Array.from(subs).sort();
  }, [transactions, selectedCategory]);

  const months = useMemo(() => {
    const mSet = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        mSet.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
      }
    });
    return Array.from(mSet).sort().reverse();
  }, [transactions]);

  const totals = useMemo(() => {
    const expenses = filteredTransactions.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    const income = filteredTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    return { expenses, income };
  }, [filteredTransactions]);

  const sankeyData = useMemo((): SankeyData => {
    // Note: Sankey itself uses transactions filtered by MONTH but NOT by specific category filters to show full flow
    const chartBaseTransactions = transactions.filter(t => {
        return filterMonth === 'all' || 
          `${new Date(t.date).getFullYear()}-${(new Date(t.date).getMonth() + 1).toString().padStart(2, '0')}` === filterMonth;
    });

    if (chartBaseTransactions.length === 0) return { nodes: [], links: [] };
    const nodesMap = new Map<string, number>();
    const links: { source: number; target: number; value: number }[] = [];
    
    const getNode = (name: string) => {
      if (!nodesMap.has(name)) nodesMap.set(name, nodesMap.size);
      return nodesMap.get(name)!;
    };

    const rootNode = getNode("Wallet Central");
    const income = chartBaseTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    const expenses = chartBaseTransactions.filter(t => !t.isIncome);
    
    if (income > 0) {
      links.push({ source: getNode("Total Income"), target: rootNode, value: income });
    }

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
      subTotals.forEach((subVal, sub) => {
        links.push({ source: catNode, target: getNode(`${cat}: ${sub}`), value: subVal });
      });
    });

    return { 
      nodes: Array.from(nodesMap.entries()).map(([name]) => ({ name, id: name })), 
      links 
    };
  }, [transactions, filterMonth]);

  const barData = useMemo(() => {
    const cats = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome).forEach(t => cats.set(t.category, (cats.get(t.category) || 0) + t.amount));
    return Array.from(cats.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#4f46e5'];

  const handleNodeClick = (nodeName: string) => {
    if (nodeName === "Wallet Central") {
        setSelectedCategory('all');
        setSelectedSubCategory('all');
    } else if (nodeName === "Total Income") {
        setSelectedCategory('Income');
        setSelectedSubCategory('all');
    } else if (nodeName.includes(': ')) {
        const [cat, sub] = nodeName.split(': ');
        setSelectedCategory(cat);
        setSelectedSubCategory(sub);
    } else {
        setSelectedCategory(nodeName);
        setSelectedSubCategory('all');
    }
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-indigo-100 bg-[#f8fafc]">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-2 rounded-lg shadow-xl shadow-slate-100">
              <i className="fas fa-chart-pie text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">SankeySpend</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Financial AI Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {transactions.length > 0 && (
              <button onClick={clearAll} className="text-slate-400 hover:text-red-600 text-[11px] font-black uppercase tracking-wider transition-all px-2">Reset Data</button>
            )}
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95">
              <i className="fas fa-cloud-upload-alt"></i> Upload Statements
              <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} disabled={isProcessing} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl mb-8 flex items-center gap-3"><i className="fas fa-exclamation-circle"></i>{error}</div>}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="font-black text-slate-900">Synchronizing with Gemini AI...</p>
            <p className="text-sm text-slate-400">Merchant analysis and deep categorization in progress.</p>
          </div>
        )}

        {transactions.length === 0 && !isProcessing && (
          <div className="max-w-2xl mx-auto text-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-sm p-12">
             <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
              <i className="fas fa-wallet text-4xl"></i>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Your money, mapped.</h2>
            <p className="text-slate-500 mb-12 leading-relaxed text-lg px-8">
              Upload any bank CSV. We'll sanitize your PII, categorize every transaction with Gemini, 
              and reveal your spending flow in beautiful high-definition.
            </p>
            <label className="cursor-pointer inline-flex items-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-indigo-200">
              <i className="fas fa-file-csv text-xl"></i>
              Select CSV Files
              <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {transactions.length > 0 && !isProcessing && (
          <div className="space-y-8">
            
            {/* Top Insight & Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
               <div className="md:col-span-2 lg:col-span-1 bg-slate-900 p-6 rounded-3xl text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fas fa-receipt text-6xl"></i></div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-1">Net Spending</p>
                  <h2 className="text-4xl font-black leading-none">${totals.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                    <i className="fas fa-arrow-up"></i> ${totals.income.toLocaleString()} Received
                  </div>
               </div>

               {/* AI Insights Tray - Now moved to the top in a row */}
               {insights.map((insight, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${insight.type === 'positive' ? 'bg-emerald-50 text-emerald-600' : insight.type === 'warning' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          <i className={`fas ${insight.type === 'positive' ? 'fa-rocket' : insight.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-lightbulb'}`}></i>
                       </div>
                       <h5 className="font-black text-slate-900 text-sm leading-tight">{insight.title}</h5>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">{insight.description}</p>
                 </div>
               ))}
               {/* Fallback if few insights */}
               {insights.length < 3 && Array(3 - insights.length).fill(null).map((_, i) => (
                 <div key={`empty-${i}`} className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-3xl flex items-center justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">More insights pending...</p>
                 </div>
               ))}
            </div>

            {/* Filter Suite */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                   <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl">
                      <button onClick={() => setFilterMonth('all')} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${filterMonth === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-indigo-600'}`}>All</button>
                      {months.map(m => (
                        <button key={m} onClick={() => setFilterMonth(m)} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${filterMonth === m ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-indigo-600'}`}>
                          {new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })}
                        </button>
                      ))}
                   </div>

                   <div className="flex-grow flex flex-wrap gap-4">
                      <div className="relative">
                        <i className="fas fa-tag absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <select 
                            className="pl-10 pr-8 py-2.5 bg-slate-50 border-none rounded-2xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                            value={selectedCategory}
                            onChange={(e) => {setSelectedCategory(e.target.value); setSelectedSubCategory('all');}}
                        >
                            <option value="all">Every Category</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="relative">
                        <i className="fas fa-tags absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <select 
                            className="pl-10 pr-8 py-2.5 bg-slate-50 border-none rounded-2xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                            value={selectedSubCategory}
                            onChange={(e) => setSelectedSubCategory(e.target.value)}
                        >
                            <option value="all">Select Sub-Category</option>
                            {subCategoriesList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="relative flex-grow min-w-[200px]">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        <input 
                            type="text" 
                            placeholder="Find specific merchant..." 
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-[12px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                   </div>
                </div>
                
                {(selectedCategory !== 'all' || selectedSubCategory !== 'all' || searchTerm !== '') && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Filters:</span>
                        {selectedCategory !== 'all' && <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">{selectedCategory}</span>}
                        {selectedSubCategory !== 'all' && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-100">{selectedSubCategory}</span>}
                        {searchTerm !== '' && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">"{searchTerm}"</span>}
                        <button onClick={() => {setSelectedCategory('all'); setSelectedSubCategory('all'); setSearchTerm('');}} className="text-[10px] font-black text-rose-500 hover:underline ml-auto">Clear Filters</button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              <div className="xl:col-span-8 space-y-8">
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Spending Flow Analysis</h3>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Interactive Cash Distribution</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Current Month</p>
                                <p className="text-sm font-black text-slate-900">{filterMonth === 'all' ? 'Combined History' : filterMonth}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50/30 rounded-3xl p-4">
                        <SankeyChart 
                            data={sankeyData} 
                            height={500} 
                            onNodeClick={handleNodeClick}
                        />
                    </div>
                    <div className="mt-8 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500"></span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Major Category</span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Income Source</span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specific Merchant</span></div>
                    </div>
                 </div>
                 
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Transaction Log</h3>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing</span>
                            <span className="text-[12px] font-black text-indigo-600">{filteredTransactions.length} items</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="pb-4 px-4">Date</th>
                            <th className="pb-4 px-4">Merchant & Source</th>
                            <th className="pb-4 px-4">Classification</th>
                            <th className="pb-4 px-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredTransactions.map(t => (
                            <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-5 px-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">{t.date}</td>
                              <td className="py-5 px-4 max-w-[300px]">
                                <p className="text-sm font-black text-slate-900 truncate">{t.description}</p>
                                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-0.5">{t.source}</p>
                              </td>
                              <td className="py-5 px-4">
                                <div className="flex flex-col gap-1">
                                    <select 
                                        className="text-[10px] font-black bg-white text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer hover:border-indigo-300 transition-colors shadow-sm"
                                        value={t.category}
                                        onChange={(e) => updateCategory(t.id, e.target.value)}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <span className="text-[9px] text-slate-400 font-bold px-2 italic">{t.subCategory || 'Other'}</span>
                                </div>
                              </td>
                              <td className={`py-5 px-4 text-right text-sm font-black ${t.isIncome ? 'text-emerald-500' : 'text-slate-900'}`}>
                                {t.isIncome ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredTransactions.length === 0 && (
                          <div className="py-24 text-center">
                              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i className="fas fa-search text-2xl"></i>
                              </div>
                              <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No matching records found.</p>
                              <button onClick={clearAll} className="text-indigo-600 text-[11px] font-black mt-4 underline uppercase tracking-widest">Clear all data filters</button>
                          </div>
                      )}
                    </div>
                 </div>
              </div>

              {/* Sidebar - Bar Chart */}
              <div className="xl:col-span-4 space-y-8">
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-fit">
                    <h3 className="text-[11px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i className="fas fa-chart-bar text-indigo-500"></i> Spending Intensity
                    </h3>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9, fontWeight: 900 }} stroke="#94a3b8" />
                          <Tooltip 
                            cursor={{ fill: '#f1f5f9' }} 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={18}>
                            {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-8 pt-8 border-t border-slate-50">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Largest Bucket</span>
                            <span className="text-sm font-black text-slate-900">{barData[0]?.name || 'N/A'}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                 </div>

                 <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-6 opacity-70">Analysis Coverage</h4>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold opacity-60">Scanned Merchants</span>
                            <span className="text-lg font-black">{new Set(transactions.map(t => t.description)).size}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold opacity-60">Statements Loaded</span>
                            <span className="text-lg font-black">{uploadedFiles.length}</span>
                        </div>
                        <div className="pt-6 border-t border-white/10">
                            <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest text-center leading-relaxed">
                                AI Analysis powered by Google Gemini 3 Flash. PII Sanitization active.
                            </p>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
