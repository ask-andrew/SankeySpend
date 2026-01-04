import React, { useMemo, useState } from 'react';
import { Transaction } from '../../types';
import { findPareto, findParetoByCategory, ParetoResult, ParetoByCategoryResult } from '../../services/advancedAnalytics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Line, CartesianGrid } from 'recharts';

interface Props {
  transactions: Transaction[];
}

const ParetoAnalysis: React.FC<Props> = ({ transactions }) => {
  const [mode, setMode] = useState<'merchant' | 'category'>('merchant');

  const { merchantPareto, categoryPareto } = useMemo(() => {
    if (!transactions.length) {
      return {
        merchantPareto: null as ParetoResult | null,
        categoryPareto: null as ParetoByCategoryResult | null,
      };
    }
    return {
      merchantPareto: findPareto(transactions),
      categoryPareto: findParetoByCategory(transactions),
    };
  }, [transactions]);

  if (!transactions.length) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 p-12 rounded-3xl text-center">
        <i className="fas fa-clock text-5xl text-amber-400 mb-4"></i>
        <h3 className="text-xl font-bold text-amber-900 mb-2">Need More Time</h3>
        <p className="text-amber-700">Upload at least a few dozen transactions to see your 80/20 money map.</p>
      </div>
    );
  }

  const isMerchant = mode === 'merchant';
  const activePareto = isMerchant ? merchantPareto : categoryPareto;

  const chartData = useMemo(() => {
    if (!activePareto) return [];
    const base = isMerchant ? activePareto.merchants : activePareto.categories;
    return base.map(p => ({
      name: p.name,
      amount: p.total,
      cumulative: p.cumulative,
    }));
  }, [activePareto, isMerchant]);

  const summaryText = useMemo(() => {
    if (!merchantPareto) return '';
    return merchantPareto.insight;
  }, [merchantPareto]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-[#8c7851] font-bold uppercase tracking-widest mb-2">Insight Two</p>
          <h2 className="text-2xl md:text-3xl font-black serif italic text-[#062c1a] mb-3">
            Your 80/20 Money Map
          </h2>
          <p className="text-sm text-slate-700 max-w-2xl">
            Your ledger shows that a small circle of merchants and categories quietly command most of your treasury.
            Shift just a few of these relationships and you reshape the whole story.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-[#fdfaf3] border border-[#dcd0b9] p-1 text-[11px] font-black uppercase tracking-widest">
          <button
            onClick={() => setMode('merchant')}
            className={`px-4 py-1.5 rounded-full flex items-center gap-2 ${
              isMerchant ? 'bg-[#2d1810] text-white shadow-sm' : 'text-[#2d1810]'
            }`}
          >
            <i className="fas fa-store"></i>
            Merchants
          </button>
          <button
            onClick={() => setMode('category')}
            className={`px-4 py-1.5 rounded-full flex items-center gap-2 ${
              !isMerchant ? 'bg-[#2d1810] text-white shadow-sm' : 'text-[#2d1810]'
            }`}
          >
            <i className="fas fa-layer-group"></i>
            Categories
          </button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <div className="bg-white rounded-3xl border border-[#dcd0b9] p-4 md:p-6 card-shadow h-[320px] md:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e9d6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: '#fdfaf3',
                  border: '1px solid #dcd0b9',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(value, key) =>
                  key === 'cumulative' ? [`${(value as number).toFixed(1)}%`, 'Cumulative share'] : [`$${value}`, 'Amount']
                }
              />
              <Bar dataKey="amount" fill="#c5a059" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="cumulative" stroke="#2d1810" strokeWidth={2} dot={false} yAxisId={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 md:p-6 card-shadow">
            <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
              What this means
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {summaryText || 'Your spending is still too light to form a clear 80/20 pattern. As your ledger grows, this report will reveal where to focus first.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParetoAnalysis;
