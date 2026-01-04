import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { detectRegrettableSpending, findBestMonth, calculateOpportunityCost } from '../../services/advancedAnalytics';

interface Props {
  transactions: Transaction[];
}

const CashFlowWaterfall: React.FC<Props> = ({ transactions }) => {
  const analysis = useMemo(() => {
    if (!transactions.length) return null;
    const regrettable = detectRegrettableSpending(transactions);
    const bestMonth = findBestMonth(transactions);
    const opportunity = calculateOpportunityCost(regrettable.potentialSavings, 'monthly');
    return { regrettable, bestMonth, opportunity };
  }, [transactions]);

  if (!analysis) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 p-12 rounded-3xl text-center">
        <i className="fas fa-clock text-5xl text-amber-400 mb-4"></i>
        <h3 className="text-xl font-bold text-amber-900 mb-2">Need More Activity</h3>
        <p className="text-amber-700">Upload a few months of spending to see how your cash actually flows through your life.</p>
      </div>
    );
  }

  const { regrettable, bestMonth, opportunity } = analysis;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-[#8c7851] font-bold uppercase tracking-widest mb-2">Insight Four</p>
          <h2 className="text-2xl md:text-3xl font-black serif italic text-[#062c1a] mb-3">
            Cash Flow Waterfall
          </h2>
          <p className="text-sm text-slate-700 max-w-2xl">
            We trace each dollar from income to essential bills, lifestyle choices, and regrettable splurgesshowing where small changes could free up real money.
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 md:p-6 card-shadow space-y-4">
          <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
            Regrettable Spending
          </p>
          <p className="text-sm text-slate-700">
            The Teller estimates that about <span className="font-semibold">${regrettable.totalRegrettable.toFixed(2)}</span> of your recent spending sits in the
            late night treats, rapid-fire taps, and weekend binges bucket.
          </p>
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <li className="bg-[#fdfaf3] border border-[#e8e1d4] rounded-2xl p-3">
              <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Late Night</p>
              <p className="text-slate-700 font-semibold">${regrettable.lateNight.total.toFixed(2)}</p>
              <p className="text-[11px] text-slate-500">{regrettable.lateNight.count} transactions</p>
            </li>
            <li className="bg-[#fdfaf3] border border-[#e8e1d4] rounded-2xl p-3">
              <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Rapid Fire</p>
              <p className="text-slate-700 font-semibold">${regrettable.rapidFire.total.toFixed(2)}</p>
              <p className="text-[11px] text-slate-500">{regrettable.rapidFire.count} transactions</p>
            </li>
            <li className="bg-[#fdfaf3] border border-[#e8e1d4] rounded-2xl p-3">
              <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Weekend Binges</p>
              <p className="text-slate-700 font-semibold">${regrettable.weekendBinge.total.toFixed(2)}</p>
              <p className="text-[11px] text-slate-500">{regrettable.weekendBinge.count} transactions</p>
            </li>
          </ul>
          <div className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest mb-1">Potential Monthly Savings</p>
              <p className="text-lg font-black text-emerald-900">
                ${regrettable.potentialSavings.toFixed(2)} / month
              </p>
              <p className="text-[11px] text-emerald-800/80">
                Gently trimming just a portion of these patterns could free this amount each month.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {bestMonth && (
            <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 md:p-6 card-shadow space-y-2">
              <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">Your Best Month</p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{bestMonth.month}</span> was your strongest savings month with a
                7savings rate of <span className="font-semibold">{bestMonth.savingsRate.toFixed(1)}%</span>.
              </p>
              <p className="text-[12px] text-slate-600">{bestMonth.whyBest}</p>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 md:p-6 card-shadow space-y-3">
            <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
              If You Redirected It
            </p>
            <p className="text-sm text-slate-700">
              Redirecting that potential savings into a simple index fund could grow into:
            </p>
            <ul className="grid grid-cols-2 gap-3 text-xs">
              <li>
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">5 Years</p>
                <p className="text-slate-700 font-semibold">${opportunity.fiveYearValue.toFixed(2)}</p>
              </li>
              <li>
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">10 Years</p>
                <p className="text-slate-700 font-semibold">${opportunity.tenYearValue.toFixed(2)}</p>
              </li>
            </ul>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-600">
              {opportunity.alternatives.slice(0, 3).map((alt) => (
                <li key={alt.description}>
                  <span className="mr-1">{alt.emoji}</span>
                  {alt.description}: <span className="font-semibold">{alt.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowWaterfall;
