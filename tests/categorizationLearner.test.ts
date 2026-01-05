import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CategorizationLearner from '../services/categorizationLearner';

// Mock localStorage for the Node/Vitest environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('CategorizationLearner', () => {
  let learner: CategorizationLearner;

  beforeEach(() => {
    learner = new CategorizationLearner();
    // Clear any existing localStorage data
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Learning from transactions', () => {
    it('should learn from merchant names', () => {
      const description = 'Transaction at Starbucks';
      const merchantName = 'Starbucks';
      const category = 'Food & Drink';

      learner.learnFromTransaction(description, merchantName, category);

      const suggestion = learner.suggestCategory('Another Starbucks purchase', 'Starbucks');
      expect(suggestion).toEqual({
        category: 'Food & Drink',
        confidence: 0.9
      });
    });

    it('should learn from description patterns', () => {
      const description = 'Netflix monthly subscription';
      const category = 'Bills & Utilities';

      learner.learnFromTransaction(description, undefined, category);

      const suggestion = learner.suggestCategory('Netflix subscription', undefined);
      expect(suggestion).toBeTruthy();
      expect(suggestion!.category).toBe('Bills & Utilities');
      expect(suggestion!.confidence).toBeGreaterThan(0);
    });

    it('should not learn from uncategorized transactions', () => {
      const description = 'Random transaction';
      const category = 'Uncategorized';

      learner.learnFromTransaction(description, undefined, category);

      const suggestion = learner.suggestCategory('Random transaction', undefined);
      expect(suggestion).toBeNull();
    });

    it('should increase confidence with repeated patterns', () => {
      const description = 'Amazon purchase';
      const category = 'Shopping';

      // Learn the same pattern multiple times
      for (let i = 0; i < 5; i++) {
        learner.learnFromTransaction(description, undefined, category);
      }

      const suggestion = learner.suggestCategory('Amazon purchase', undefined);
      expect(suggestion).toBeTruthy();
      // Repeated learning should give at least moderate confidence
      expect(suggestion!.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('Pattern matching', () => {
    beforeEach(() => {
      // Pre-train with some patterns
      learner.learnFromTransaction('Uber ride to downtown', 'Uber', 'Transport');
      learner.learnFromTransaction('Whole Foods Market', 'Whole Foods', 'Food & Drink');
      learner.learnFromTransaction('Netflix subscription', 'Netflix', 'Bills & Utilities');
    });

    it('should match exact merchant names', () => {
      const suggestion = learner.suggestCategory('Uber trip', 'Uber');
      expect(suggestion).toEqual({
        category: 'Transport',
        confidence: 0.9
      });
    });

    it('should match partial description patterns', () => {
      const suggestion = learner.suggestCategory('Whole Foods groceries', undefined);
      expect(suggestion).toBeTruthy();
      expect(suggestion!.category).toBe('Food & Drink');
    });

    it('should return null for unknown patterns', () => {
      const suggestion = learner.suggestCategory('Unknown merchant', undefined);
      expect(suggestion).toBeNull();
    });
  });

  describe('Memory management', () => {
    it('should persist data to localStorage', () => {
      learner.learnFromTransaction('Test transaction', 'Test', 'Shopping');
      
      const savedData = localStorage.getItem('teller_categorization_memory');
      expect(savedData).toBeTruthy();
      
      const parsed = JSON.parse(savedData!);
      // N-gram expansion may yield multiple learned patterns for a single transaction
      expect(parsed.patterns.length).toBeGreaterThanOrEqual(1);
      expect(parsed.merchantPatterns).toHaveLength(1);
    });

    it('should load data from localStorage', () => {
      // First learner saves data
      learner.learnFromTransaction('Test transaction', 'Test', 'Shopping');
      
      // Second learner should load the saved data
      const learner2 = new CategorizationLearner();
      const suggestion = learner2.suggestCategory('Test transaction', 'Test');
      
      expect(suggestion).toEqual({
        category: 'Shopping',
        confidence: 0.9
      });
    });

    it('should clear memory', () => {
      learner.learnFromTransaction('Test transaction', 'Test', 'Shopping');
      learner.clearMemory();
      
      const suggestion = learner.suggestCategory('Test transaction', 'Test');
      expect(suggestion).toBeNull();
      
      const savedData = localStorage.getItem('teller_categorization_memory');
      expect(savedData).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      learner.learnFromTransaction('Netflix subscription', 'Netflix', 'Bills & Utilities');
      learner.learnFromTransaction('Uber ride', 'Uber', 'Transport');
      learner.learnFromTransaction('Amazon purchase', 'Amazon', 'Shopping');
      learner.learnFromTransaction('Another Netflix payment', 'Netflix', 'Bills & Utilities');

      const stats = learner.getStats();
      
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.merchantPatterns).toBe(3); // Netflix, Uber, Amazon
      expect(stats.topCategories).toHaveLength(3);
      
      // Bills & Utilities should be the top category (learned twice)
      expect(stats.topCategories[0].category).toBe('Bills & Utilities');
      expect(stats.topCategories[0].count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Import/Export', () => {
    it('should export memory data', () => {
      learner.learnFromTransaction('Test transaction', 'Test', 'Shopping');
      
      const exported = learner.exportMemory();
      const parsed = JSON.parse(exported);
      
      expect(parsed.patterns.length).toBeGreaterThanOrEqual(1);
      expect(parsed.merchantPatterns).toHaveLength(1);
      expect(parsed.exportedAt).toBeTruthy();
    });

    it('should import memory data', () => {
      const testData = {
        patterns: [{
          pattern: 'netflix',
          category: 'Bills & Utilities',
          confidence: 0.8,
          lastSeen: new Date().toISOString(),
          usageCount: 3
        }],
        merchantPatterns: [['netflix', 'Bills & Utilities']],
        exportedAt: new Date().toISOString()
      };

      const success = learner.importMemory(JSON.stringify(testData));
      expect(success).toBe(true);

      const suggestion = learner.suggestCategory('Netflix payment', 'Netflix');
      expect(suggestion).toEqual({
        category: 'Bills & Utilities',
        confidence: 0.9
      });
    });

    it('should handle invalid import data', () => {
      const success = learner.importMemory('invalid json');
      expect(success).toBe(false);
    });
  });

  describe('N-gram generation', () => {
    it('should create single word patterns', () => {
      learner.learnFromTransaction('Amazon purchase', undefined, 'Shopping');
      
      const suggestion = learner.suggestCategory('Amazon', undefined);
      expect(suggestion).toBeTruthy();
      expect(suggestion!.category).toBe('Shopping');
    });

    it('should create multi-word patterns', () => {
      learner.learnFromTransaction('Whole Foods Market', undefined, 'Food & Drink');
      
      const suggestion = learner.suggestCategory('Whole Foods', undefined);
      expect(suggestion).toBeTruthy();
      expect(suggestion!.category).toBe('Food & Drink');
    });

    it('should handle very short descriptions', () => {
      learner.learnFromTransaction('ATM', undefined, 'Money & Finance');
      
      // Very short words may still produce a low-confidence suggestion
      const suggestion = learner.suggestCategory('ATM fee', undefined);
      expect(suggestion).toBeTruthy();
      expect(suggestion!.category).toBe('Money & Finance');
    });
  });
});
