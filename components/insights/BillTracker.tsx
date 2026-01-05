import React, { useMemo } from 'react';
import { Transaction } from '../../types';

interface RecurringBill {
  name: string;
  category: string;
  averageAmount: number;
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly';
  occurrences: number;
  recentAmounts: { date: string; amount: number }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
  lastAmount: number;
  isUnusual: boolean;
}

interface Props {
  transactions: Transaction[];
}

const BillTracker: React.FC<Props> = ({ transactions }) => {
  const analysis = useMemo(() => {
    if (!transactions.length) return null;

    // Filter for potential bills (exclude income, transfers, and small one-off purchases)
    const potentialBills = transactions.filter(t => 
      !t.isIncome && 
      t.category !== 'Account Transfer' && 
      !t.isInternalTransfer &&
      t.amount > 20 // Only consider amounts over $20 as potential bills
    );

    // Group by similar merchant/description patterns
    const merchantGroups = new Map<string, Transaction[]>();
    
    potentialBills.forEach(transaction => {
      // Normalize merchant name for grouping
      const key = normalizeMerchantName(transaction.description, transaction.merchantName);
      if (!merchantGroups.has(key)) {
        merchantGroups.set(key, []);
      }
      merchantGroups.get(key)!.push(transaction);
    });

    // Analyze each group for recurring patterns
    const recurringBills: RecurringBill[] = [];
    
    merchantGroups.forEach((txs, merchantKey) => {
      if (txs.length < 2) return; // Need at least 2 occurrences to be recurring

      // Sort by date
      const sortedTxs = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Determine frequency
      const frequency = detectFrequency(sortedTxs);
      if (!frequency) return; // Skip if no clear pattern

      // Calculate average and recent amounts
      const amounts = sortedTxs.map(tx => tx.amount);
      const averageAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      
      // Get last 3 occurrences for trend analysis
      const recentAmounts = sortedTxs.slice(-3).map(tx => ({
        date: tx.date,
        amount: tx.amount
      }));

      // Calculate trend
      const trend = calculateTrend(recentAmounts);
      const percentChange = calculatePercentChange(recentAmounts);

      // Flag unusual increases
      const isUnusual = trend === 'increasing' && percentChange > 15; // 15%+ increase

      recurringBills.push({
        name: merchantKey,
        category: sortedTxs[0].category,
        averageAmount,
        frequency,
        occurrences: sortedTxs.length,
        recentAmounts,
        trend,
        percentChange,
        lastAmount: recentAmounts[recentAmounts.length - 1].amount,
        isUnusual
      });
    });

    // Sort by amount (highest first) and then by unusual status
    return recurringBills
      .sort((a, b) => {
        if (a.isUnusual && !b.isUnusual) return -1;
        if (!a.isUnusual && b.isUnusual) return 1;
        return b.lastAmount - a.lastAmount;
      });
  }, [transactions]);

  if (!analysis || analysis.length === 0) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 p-12 rounded-3xl text-center">
        <i className="fas fa-file-invoice-dollar text-5xl text-amber-400 mb-4"></i>
        <h3 className="text-xl font-bold text-amber-900 mb-2">No Recurring Bills Detected</h3>
        <p className="text-amber-700">Upload more transaction history to identify your recurring bills and track spending changes.</p>
      </div>
    );
  }

  const unusualBills = analysis.filter(bill => bill.isUnusual);
  const totalMonthlyBills = analysis.reduce((sum, bill) => {
    const monthlyEquivalent = convertToMonthly(bill.lastAmount, bill.frequency);
    return sum + monthlyEquivalent;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-[#8c7851] font-bold uppercase tracking-widest mb-2">Bill Watch</p>
          <h2 className="text-2xl md:text-3xl font-black serif italic text-[#062c1a] mb-3">
            Recurring Bills Monitor
          </h2>
          <p className="text-sm text-slate-700 max-w-2xl">
            We track your recurring bills and alert you when they creep up unexpectedly. 
            Small increases can add up to hundreds over time.
          </p>
        </div>
      </div>

      {/* Alert for unusual increases */}
      {unusualBills.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 rounded-full p-3">
              <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                {unusualBills.length} Bill{unusualBills.length > 1 ? 's' : ''} Increased Unusually
              </h3>
              <p className="text-red-700 mb-3">
                These bills have gone up by more than 15% recently. Consider reviewing or negotiating.
              </p>
              <div className="space-y-2">
                {unusualBills.map(bill => (
                  <div key={bill.name} className="bg-white rounded-xl p-3 border border-red-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-red-900">{bill.name}</p>
                        <p className="text-sm text-red-700">
                          {bill.frequency} • Up {bill.percentChange.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-900">${bill.lastAmount.toFixed(2)}</p>
                        <p className="text-xs text-red-600">was ${bill.averageAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 card-shadow">
          <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
            Total Monthly Bills
          </p>
          <p className="text-2xl font-black text-[#062c1a]">
            ${totalMonthlyBills.toFixed(2)}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Across {analysis.length} recurring bills
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 card-shadow">
          <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
            Bills Increasing
          </p>
          <p className="text-2xl font-black text-orange-600">
            {analysis.filter(b => b.trend === 'increasing').length}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Watch for price creep
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 card-shadow">
          <p className="text-[10px] text-[#8c7851] font-bold uppercase tracking-widest mb-1">
            Potential Savings
          </p>
          <p className="text-2xl font-black text-emerald-600">
            ${calculatePotentialSavings(analysis).toFixed(2)}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            If you negotiated recent increases
          </p>
        </div>
      </div>

      {/* Detailed bill list */}
      <div className="bg-white rounded-3xl border border-[#dcd0b9] p-5 md:p-6 card-shadow">
        <p className="text-[11px] text-[#8c7851] font-bold uppercase tracking-widest mb-4">
          All Recurring Bills
        </p>
        <div className="space-y-3">
          {analysis.map(bill => (
            <BillRow key={bill.name} bill={bill} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper component for individual bill rows
const BillRow: React.FC<{ bill: RecurringBill }> = ({ bill }) => {
  const trendIcon = {
    increasing: 'fa-arrow-trend-up text-orange-500',
    decreasing: 'fa-arrow-trend-down text-emerald-500',
    stable: 'fa-minus text-slate-400'
  }[bill.trend];

  const trendColor = {
    increasing: 'text-orange-600',
    decreasing: 'text-emerald-600', 
    stable: 'text-slate-600'
  }[bill.trend];

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      bill.isUnusual 
        ? 'border-red-200 bg-red-50' 
        : 'border-[#e8e1d4] bg-[#fdfaf3]'
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-[#062c1a]">{bill.name}</h4>
            {bill.isUnusual && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">
                UNUSUAL INCREASE
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="capitalize">{bill.frequency}</span>
            <span>•</span>
            <span>{bill.occurrences} payments</span>
            <span>•</span>
            <span className={trendColor}>
              <i className={`fas ${trendIcon} mr-1`}></i>
              {bill.trend}
              {bill.trend !== 'stable' && ` ${Math.abs(bill.percentChange).toFixed(1)}%`}
            </span>
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="font-bold text-lg text-[#062c1a]">${bill.lastAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-500">
            avg ${bill.averageAmount.toFixed(2)}
          </p>
        </div>
      </div>
      
      {/* Mini trend chart for recent amounts */}
      {bill.recentAmounts.length > 1 && (
        <div className="mt-3 pt-3 border-t border-[#e8e1d4]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Recent payments:</span>
            <div className="flex items-center gap-2">
              {bill.recentAmounts.map((payment, idx) => (
                <div key={idx} className="text-right">
                  <p className="font-semibold text-slate-700">${payment.amount.toFixed(0)}</p>
                  <p className="text-slate-400">
                    {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function normalizeMerchantName(description: string, merchantName?: string): string {
  const primary = merchantName || description;
  
  // Remove common prefixes/suffixes and normalize
  return primary
    .toLowerCase()
    .replace(/^(payment|charge|debit|credit|auto|ach|transfer)\s*/i, '')
    .replace(/\s*(payment|charge|debit|credit|auto|ach|transfer)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3) // Keep first 3 words
    .join(' ');
}

function detectFrequency(transactions: Transaction[]): RecurringBill['frequency'] | null {
  if (transactions.length < 2) return null;

  const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
  const intervals: number[] = [];
  
  for (let i = 1; i < dates.length; i++) {
    const daysDiff = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(daysDiff);
  }

  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

  // Determine frequency based on average interval
  if (avgInterval >= 25 && avgInterval <= 35) return 'monthly';
  if (avgInterval >= 6 && avgInterval <= 10) return 'weekly';
  if (avgInterval >= 12 && avgInterval <= 18) return 'biweekly';
  if (avgInterval >= 80 && avgInterval <= 100) return 'quarterly';
  if (avgInterval >= 350 && avgInterval <= 380) return 'yearly';
  
  return null;
}

function calculateTrend(recentAmounts: { date: string; amount: number }[]): RecurringBill['trend'] {
  if (recentAmounts.length < 2) return 'stable';

  const first = recentAmounts[0].amount;
  const last = recentAmounts[recentAmounts.length - 1].amount;
  const change = ((last - first) / first) * 100;

  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

function calculatePercentChange(recentAmounts: { date: string; amount: number }[]): number {
  if (recentAmounts.length < 2) return 0;

  const first = recentAmounts[0].amount;
  const last = recentAmounts[recentAmounts.length - 1].amount;
  return Math.abs(((last - first) / first) * 100);
}

function convertToMonthly(amount: number, frequency: RecurringBill['frequency']): number {
  const multipliers = {
    monthly: 1,
    weekly: 4.33, // Average weeks per month
    biweekly: 2.17, // Average biweekly periods per month
    quarterly: 0.33,
    yearly: 0.083
  };
  
  return amount * (multipliers[frequency] || 1);
}

function calculatePotentialSavings(bills: RecurringBill[]): number {
  return bills
    .filter(bill => bill.isUnusual)
    .reduce((sum, bill) => {
      const increase = bill.lastAmount - bill.averageAmount;
      const monthlyIncrease = convertToMonthly(increase, bill.frequency);
      return sum + monthlyIncrease;
    }, 0);
}

export default BillTracker;
