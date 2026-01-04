import { describe, it, expect } from 'vitest';
import { Transaction } from '../types';
import { calculateHabitTax, HABITS, findPareto, findParetoByCategory, detectLifestyleInflation } from '../services/advancedAnalytics';

const baseTx = (partial: Partial<Transaction>): Transaction => ({
  id: 'id',
  date: '2024-01-01',
  description: 'Test',
  amount: 0,
  category: 'Food & Drink',
  isIncome: false,
  source: 'Test',
  ...partial,
});

describe('advancedAnalytics - Habit Tax', () => {
  it('detects coffee habit and computes annual spend', () => {
    const transactions: Transaction[] = [
      baseTx({ id: '1', description: 'Starbucks Coffee', amount: 5 }),
      baseTx({ id: '2', description: 'Local Cafe Latte', amount: 4 }),
    ];

    const coffeeHabit = HABITS.find(h => h.name === 'Daily Coffee')!;
    const result = calculateHabitTax(transactions, coffeeHabit);

    expect(result).not.toBeNull();
    expect(result!.annualSpend).toBeGreaterThan(0);
    expect(result!.habit).toBe('Daily Coffee');
  });
});

describe('advancedAnalytics - Pareto', () => {
  it('finds top merchants contributing to 80% of spend', () => {
    const transactions: Transaction[] = [
      baseTx({ id: '1', description: 'A', merchantName: 'Merchant A', amount: 80 }),
      baseTx({ id: '2', description: 'B', merchantName: 'Merchant B', amount: 10 }),
      baseTx({ id: '3', description: 'C', merchantName: 'Merchant C', amount: 10 }),
    ];

    const result = findPareto(transactions);
    expect(result.merchants.length).toBeGreaterThan(0);
    expect(result.merchants[0].name).toBe('Merchant A');
    expect(result.merchants[0].percentage).toBeGreaterThan(0);
  });

  it('finds pareto by category', () => {
    const transactions: Transaction[] = [
      baseTx({ id: '1', category: 'Food & Drink', amount: 50 }),
      baseTx({ id: '2', category: 'Housing', amount: 150 }),
    ];

    const result = findParetoByCategory(transactions);
    expect(result.categories.length).toBeGreaterThan(0);
  });
});

describe('advancedAnalytics - Lifestyle Inflation', () => {
  it('returns null with insufficient months', () => {
    const transactions: Transaction[] = [
      baseTx({ id: '1', date: '2024-01-01', amount: 100 }),
      baseTx({ id: '2', date: '2024-01-02', amount: 200 }),
    ];

    const result = detectLifestyleInflation(transactions);
    expect(result).toBeNull();
  });

  it('detects inflation when recent months are higher', () => {
    const transactions: Transaction[] = [
      // Early months
      baseTx({ id: '1', date: '2024-01-01', amount: 100, category: 'Food & Drink' }),
      baseTx({ id: '2', date: '2024-02-01', amount: 100, category: 'Food & Drink' }),
      baseTx({ id: '3', date: '2024-03-01', amount: 100, category: 'Food & Drink' }),
      // Recent months
      baseTx({ id: '4', date: '2024-04-01', amount: 200, category: 'Food & Drink' }),
      baseTx({ id: '5', date: '2024-05-01', amount: 200, category: 'Food & Drink' }),
      baseTx({ id: '6', date: '2024-06-01', amount: 200, category: 'Food & Drink' }),
    ];

    const result = detectLifestyleInflation(transactions);
    expect(result).not.toBeNull();
    expect(result!.inflationRate).toBeGreaterThan(0);
    expect(result!.topIncreases.length).toBeGreaterThan(0);
  });
});
