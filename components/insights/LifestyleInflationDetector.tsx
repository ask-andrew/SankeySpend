import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { detectLifestyleInflation, LifestyleInflationResult } from '../../services/advancedAnalytics';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  transactions: Transaction[];
}

const LifestyleInflationDetector: React.FC<Props> = ({ transactions }) => {
  const result = useMemo<LifestyleInflationResult | null>(() => {
    if (!transactions.length) return null;
    return detectLifestyleInflation(transactions);
  }, [transactions]);

  if (!transactions.length || !result) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 p-12 rounded-3xl text-center">
        <i className="fas fa-clock text-5xl text-amber-400 mb-4"></i>
        <h3 className="text-xl font-bold text-amber-900 mb-2">Need More Time</h3>
        <p className="text-amber-700">Upload at least 3 months of transactions to see your lifestyle inflation report.</p>
      </div>
    );
  }

  const trendColor =
    result.inflationRate < 5 ? '#16a34a' : result.inflationRate <= 15 ? '#eab308' : '#b91c1c';

  const headline =
    result.inflationRate < 5
      ? 'Spending Champion: Lifestyle inflation is under control.'
      : result.inflationRate <= 15
      ? 'Stable Ledger: Spending has inched up, but not dramatically.'
      : 'Wake-Up Call: Your lifestyle costs are climbing quickly.';

  const explainer =
    result.inflationRate < 5
      ? 'Your recent months look remarkably similar to your early baseline. You are keeping lifestyle creep firmly in check.'
      : result.inflationRate <= 15
      ? 'Your spending has grown, but not alarmingly. A few categories have drifted upward—worth a quick review, not a full audit.'
      : 'Compared with your early months, your recent ledger shows a clear upward climb. A handful of categories are quietly inflating your lifestyle.';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-[#8c7851] font-bold uppercase tracking-widest mb-2">Insight Three</p>
          <h2 className="text-2xl md:text-3xl font-black serif italic text-[#062c1a] mb-3">
            Lifestyle Inflation Detector
          </h2>
          <p className="text-sm text-slate-700 max-w-2xl">
            We compare your earliest months to your most recent ones to see whether your lifestyle is quietly drifting upward—and by how much.
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <div className="bg-white rounded-3xl border border-[#dcd0b9] p-4 md:p-6 card-shadow h-[320px] md:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.trend} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e9d6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: '#fdfaf3',
                  border: '1px solid #dcd0b9',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(value) => [`$${(value as number).toFixed(0)}`, 'Total spend']}
              />
              <Line type="monotone" dataKey="total" stroke={trendColor} strokeWidth={2.4} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 md:p-6 card-shadow space-y-3">
            <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
              What this means
            </p>
            <p className="text-sm font-semibold text-[#062c1a]">{headline}</p>
            <p className="text-sm text-slate-700 leading-relaxed">{explainer}</p>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-dashed border-[#e8e1d4]">
              <div>
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
                  Early You
                </p>
                <p className="text-slate-700 font-semibold">
                  ${result.earlyAvg.toFixed(0)} / month
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
                  Recent You
                </p>
                <p className="text-slate-700 font-semibold">
                  ${result.recentAvg.toFixed(0)} / month
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
                  Lifestyle Inflation
                </p>
                <p className="text-slate-700 font-semibold">
                  {result.inflationRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
                  Annual Impact
                </p>
                <p className="text-slate-700 font-semibold">
                  ${result.annualImpact.toFixed(0)} / yr
                </p>
              </div>
            </div>
          </div>

          {result.topIncreases.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 md:p-6 card-shadow space-y-3">
              <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
                Where the creep is coming from
              </p>
              <ul className="space-y-2 text-xs">
                {result.topIncreases.map(([category, change]) => (
                  <li key={category} className="flex items-center justify-between gap-3">
                    <span className="text-slate-700 font-medium">{category}</span>
                    <span className={`font-semibold ${change > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {change > 0 ? '+' : ''}
                      {change.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LifestyleInflationDetector;
