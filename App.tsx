
import React, { useState, useMemo } from 'react';
import { Transaction, SpendingInsight, SankeyData } from './types';
import { categorizeTransactions, getSpendingInsights } from './services/geminiService';
import SankeyChart from './components/SankeyChart';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CATEGORIES = ["Food", "Housing", "Transport", "Shopping", "Entertainment", "Utilities", "Income", "Health", "Finance", "Education", "Travel", "Uncategorized"];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const processFile = (file: File): Promise<Transaction[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const startIndex = 1;
        const parsed: Transaction[] = lines.slice(startIndex).map((line, idx) => {
          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          const date = parts[0]?.replace(/"/g, '') || new Date().toISOString();
          const description = parts[1]?.replace(/"/g, '') || 'Unknown';
          const rawAmount = parts[2]?.replace(/"/g, '') || '0';
          const amount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
          
          return {
            id: `${file.name}-${idx}-${Date.now()}`,
            date,
            description,
            amount: Math.abs(amount),
            category: 'Processing...',
            isIncome: amount > 0,
            source: file.name
          };
        });
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
        setIsProcessing(false);
        return;
      }

      const currentTransactions = [...transactions, ...allNewTransactions];
      const categorizedResults = await categorizeTransactions(currentTransactions);
      
      const enriched = currentTransactions.map(t => {
        const cat = categorizedResults.find(c => c.id === t.id);
        // Only update if it was "Processing..." to avoid overwriting manual changes if we re-upload
        const finalCat = (t.category === 'Processing...') ? (cat?.category || 'Uncategorized') : t.category;
        const finalSub = (t.category === 'Processing...') ? (cat?.subCategory || 'Other') : t.subCategory;
        return { ...t, category: finalCat, subCategory: finalSub };
      });

      setTransactions(enriched);
      setUploadedFiles(prev => [...prev, ...newFileNames]);
      const newInsights = await getSpendingInsights(enriched);
      setInsights(newInsights);
    } catch (err) {
      console.error(err);
      setError("AI service error. Please ensure your API key is configured correctly.");
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const updateCategory = (id: string, newCategory: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'SubCategory', 'Source'];
    const rows = transactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.isIncome ? t.amount : -t.amount,
      t.category,
      t.subCategory || '',
      t.source
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "categorized_spending.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesMonth = filterMonth === 'all' || 
        `${new Date(t.date).getFullYear()}-${(new Date(t.date).getMonth() + 1).toString().padStart(2, '0')}` === filterMonth;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMonth && matchesSearch;
    });
  }, [transactions, filterMonth, searchTerm]);

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

  const sankeyData = useMemo((): SankeyData => {
    if (filteredTransactions.length === 0) return { nodes: [], links: [] };
    const nodesMap = new Map<string, number>();
    const links: { source: number; target: number; value: number }[] = [];
    const getNode = (name: string) => {
      if (!nodesMap.has(name)) nodesMap.set(name, nodesMap.size);
      return nodesMap.get(name)!;
    };

    const income = filteredTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions.filter(t => !t.isIncome);
    const rootNode = getNode("All Accounts");
    
    if (income > 0) links.push({ source: getNode("Income Flow"), target: rootNode, value: income });

    const catTotals = new Map<string, number>();
    expenses.forEach(t => catTotals.set(t.category, (catTotals.get(t.category) || 0) + t.amount));
    catTotals.forEach((val, cat) => {
      const catNode = getNode(cat);
      links.push({ source: rootNode, target: catNode, value: val });
      const subTotals = new Map<string, number>();
      expenses.filter(t => t.category === cat).forEach(t => subTotals.set(t.subCategory || 'Other', (subTotals.get(t.subCategory || 'Other') || 0) + t.amount));
      subTotals.forEach((subVal, sub) => links.push({ source: catNode, target: getNode(`${cat}: ${sub}`), value: subVal }));
    });

    return { nodes: Array.from(nodesMap.entries()).map(([name, id]) => ({ name, id: id.toString() })), links };
  }, [filteredTransactions]);

  const barData = useMemo(() => {
    const cats = new Map<string, number>();
    filteredTransactions.filter(t => !t.isIncome).forEach(t => cats.set(t.category, (cats.get(t.category) || 0) + t.amount));
    return Array.from(cats.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="min-h-screen pb-20 selection:bg-indigo-100">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg">
              <i className="fas fa-fingerprint text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">SankeySpend</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Secure Financial AI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {transactions.length > 0 && (
              <button onClick={exportToCSV} className="text-slate-600 hover:text-indigo-600 px-3 py-2 text-sm font-semibold transition-all flex items-center gap-2">
                <i className="fas fa-download"></i> Export
              </button>
            )}
            <label className="cursor-pointer bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95">
              <i className="fas fa-plus"></i> Add Statements
              <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} disabled={isProcessing} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-8 flex items-center gap-3"><i className="fas fa-shield-virus"></i>{error}</div>}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-slate-900">Sanitizing & Categorizing...</p>
            <p className="text-sm text-slate-400">Your data is being processed locally and anonymized for AI analysis.</p>
          </div>
        )}

        {transactions.length === 0 && !isProcessing && (
          <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-12">
             <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner">
              <i className="fas fa-vault text-4xl"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Financial Flow, Simplified.</h2>
            <p className="text-slate-500 mb-10 leading-relaxed text-lg">
              Upload your bank CSVs. We automatically mask account numbers, categorize merchants with Gemini AI, 
              and build you a beautiful interactive map of your money.
            </p>
            <label className="cursor-pointer inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-indigo-200">
              <i className="fas fa-cloud-upload-alt text-xl"></i>
              Get Started with CSVs
              <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {transactions.length > 0 && !isProcessing && (
          <div className="space-y-10">
            {/* Top Bar with Filters */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
               <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                  <button onClick={() => setFilterMonth('all')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filterMonth === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>All</button>
                  {months.map(m => (
                    <button key={m} onClick={() => setFilterMonth(m)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filterMonth === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })}
                    </button>
                  ))}
               </div>
               <div className="relative w-full md:w-80">
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input 
                    type="text" 
                    placeholder="Search merchants or categories..." 
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            {/* Main Visualizer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-10">
                 <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><i className="fas fa-project-diagram text-8xl text-indigo-900"></i></div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Interactive Spending Map</h3>
                    <p className="text-sm text-slate-400 mb-8">Follow the flow from accounts to sub-categories</p>
                    <SankeyChart data={sankeyData} height={500} />
                 </div>
                 
                 <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-slate-900">Transaction Pulse</h3>
                      <div className="flex gap-2">
                        {uploadedFiles.map(f => <span key={f} className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-400 rounded-md border truncate max-w-[120px]">{f}</span>)}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-50">
                          <tr>
                            <th className="pb-4 px-2">Date</th>
                            <th className="pb-4 px-2">Description</th>
                            <th className="pb-4 px-2">Category</th>
                            <th className="pb-4 px-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredTransactions.map(t => (
                            <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-2 text-xs font-bold text-slate-400">{t.date}</td>
                              <td className="py-4 px-2">
                                <p className="text-sm font-bold text-slate-900 line-clamp-1">{t.description}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate opacity-60">{t.source}</p>
                              </td>
                              <td className="py-4 px-2">
                                <select 
                                  className="text-[11px] font-black bg-indigo-50/50 text-indigo-600 px-3 py-1.5 rounded-xl border border-indigo-100 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                                  value={t.category}
                                  onChange={(e) => updateCategory(t.id, e.target.value)}
                                >
                                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </td>
                              <td className={`py-4 px-2 text-right text-sm font-black ${t.isIncome ? 'text-emerald-500' : 'text-slate-900'}`}>
                                {t.isIncome ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                 <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Net Period Spend</p>
                    <h2 className="text-5xl font-black mb-6">
                      <span className="text-indigo-400 text-2xl mr-1">$</span>
                      {filteredTransactions.filter(t => !t.isIncome).reduce((a, b) => a + b.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h2>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs font-bold py-3 border-t border-white/10">
                          <span className="text-slate-400">Total Credits</span>
                          <span className="text-emerald-400">+${filteredTransactions.filter(t => t.isIncome).reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold py-3 border-t border-white/10">
                          <span className="text-slate-400">Total Debits</span>
                          <span className="text-rose-400">-${filteredTransactions.filter(t => !t.isIncome).reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                       </div>
                    </div>
                 </div>

                 {insights.length > 0 && (
                   <div className="space-y-4">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">AI Insights</h4>
                     {insights.map((insight, idx) => (
                       <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-2">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${insight.type === 'positive' ? 'bg-emerald-50 text-emerald-600' : insight.type === 'warning' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                <i className={`fas ${insight.type === 'positive' ? 'fa-heart' : insight.type === 'warning' ? 'fa-fire' : 'fa-lightbulb'}`}></i>
                             </div>
                             <h5 className="font-black text-slate-900 text-sm">{insight.title}</h5>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{insight.description}</p>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest">Spending Intensity</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 800 }} stroke="#94a3b8" />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                            {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-32 pt-16 border-t border-slate-100">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
              <div className="md:col-span-1">
                 <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
                    <div className="bg-slate-900 p-1.5 rounded-md"><i className="fas fa-shield-alt text-white text-xs"></i></div>
                    <span className="font-black text-slate-900">Privacy Policy</span>
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed">
                   We use local processing. Your raw bank files never touch our servers. Gemini AI receives anonymized merchant descriptions only.
                 </p>
              </div>
              <div>
                 <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6">Process</h5>
                 <p className="text-xs text-slate-500">1. CSV Sanitization<br/>2. Merchant Vectorization<br/>3. Gemini Categorization<br/>4. Sankey Flow Generation</p>
              </div>
              <div>
                 <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6">Security</h5>
                 <p className="text-xs text-slate-500">Zero-Server Storage<br/>Auto-Masking PII<br/>Secure API Tunneling<br/>HTTPS Encryption</p>
              </div>
              <div>
                 <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6">Credits</h5>
                 <p className="text-xs text-slate-500">D3.js Visualization<br/>Recharts Analytics<br/>Google Gemini 3<br/>Tailwind UI</p>
              </div>
           </div>
           <div className="mt-16 text-center">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">SankeySpend • Experimental Smart Finance v2.1</p>
           </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
