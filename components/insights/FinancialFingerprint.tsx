import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { calculateFinancialHealthScore, HabitTaxResult } from '../../services/advancedAnalytics';

interface Props {
  transactions: Transaction[];
  habitTaxResults: HabitTaxResult[];
}

const FinancialFingerprint: React.FC<Props> = ({ transactions, habitTaxResults }) => {
  const health = useMemo(() => {
    if (!transactions.length) return null;
    return calculateFinancialHealthScore(transactions, habitTaxResults || []);
  }, [transactions, habitTaxResults]);

  if (!transactions.length || !health) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 p-12 rounded-3xl text-center">
        <i className="fas fa-fingerprint text-5xl text-amber-400 mb-4"></i>
        <h3 className="text-xl font-bold text-amber-900 mb-2">Your Financial Fingerprint Awaits</h3>
        <p className="text-amber-700">Upload at least a few months of income and spending to see your full money fingerprint.</p>
      </div>
    );
  }

  const { score, grade, breakdown, insight } = health;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-[#8c7851] font-bold uppercase tracking-widest mb-2">Insight Five</p>
          <h2 className="text-2xl md:text-3xl font-black serif italic text-[#062c1a] mb-3">
            Your Financial Fingerprint
          </h2>
          <p className="text-sm text-slate-700 max-w-2xl">
            A single score that blends essentials, savings, stability, and habit control into one readable fingerprint of your financial health.
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)] items-start">
        <div className="bg-white rounded-3xl border border-[#dcd0b9] p-6 card-shadow flex flex-col items-center justify-center space-y-4">
          <div className="relative inline-flex items-center justify-center w-40 h-40 rounded-full border-[10px] border-[#c5a059] bg-[#fdfaf3] shadow-inner">
            <div className="absolute inset-3 rounded-full border border-[#e8e1d4]" />
            <div className="relative text-center">
              <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-[0.2em] mb-1">Score</p>
              <p className="text-4xl font-black text-[#062c1a] leading-none">{score}</p>
              <p className="mt-1 text-sm font-bold text-[#8c7851]">Grade {grade}</p>
            </div>
          </div>
          <p className="text-[12px] text-slate-700 text-center max-w-xs">{insight}</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 md:p-6 card-shadow space-y-3">
            <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Score Breakdown</p>
            <ul className="grid grid-cols-2 gap-3 text-xs">
              <li className="bg-[#fdfaf3] rounded-2xl border border-[#e8e1d4] p-3">
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Essentials</p>
                <p className="text-slate-700 font-semibold">{breakdown.essentialsRatio}/30 pts</p>
                <p className="text-[11px] text-slate-500">Share of spending on housing, transport, and bills.</p>
              </li>
              <li className="bg-[#fdfaf3] rounded-2xl border border-[#e8e1d4] p-3">
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Savings Rate</p>
                <p className="text-slate-700 font-semibold">{breakdown.savingsRate}/30 pts</p>
                <p className="text-[11px] text-slate-500">How much of income you keep rather than spend.</p>
              </li>
              <li className="bg-[#fdfaf3] rounded-2xl border border-[#e8e1d4] p-3">
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Consistency</p>
                <p className="text-slate-700 font-semibold">{breakdown.consistency}/20 pts</p>
                <p className="text-[11px] text-slate-500">Whether your daily spending is steady or spiky.</p>
              </li>
              <li className="bg-[#fdfaf3] rounded-2xl border border-[#e8e1d4] p-3">
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Habit Control</p>
                <p className="text-slate-700 font-semibold">{breakdown.habitControl}/20 pts</p>
                <p className="text-[11px] text-slate-500">How much of your budget is tied up in habits.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialFingerprint;
