import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import CategorizationLearner from '../services/categorizationLearner';

interface SmartCategorizationSuggestionsProps {
  transactions: Transaction[];
  onCategorize: (transactionIds: string[], category: string) => void;
  categorizationLearner: CategorizationLearner;
}

const SmartCategorizationSuggestions: React.FC<SmartCategorizationSuggestionsProps> = ({
  transactions,
  onCategorize,
  categorizationLearner
}) => {
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [showHighConfidenceOnly, setShowHighConfidenceOnly] = useState(false);

  // Filter uncategorized transactions and get suggestions
  const uncategorizedTransactions = useMemo(() => {
    return transactions.filter(t => t.category === 'Uncategorized' || t.category === 'Categorizing...');
  }, [transactions]);

  const transactionsWithSuggestions = useMemo(() => {
    return uncategorizedTransactions.map(transaction => {
      const suggestion = categorizationLearner.suggestCategory(transaction.description, transaction.merchantName);
      return {
        ...transaction,
        suggestedCategory: suggestion?.category,
        confidence: suggestion?.confidence || 0
      };
    }).sort((a, b) => {
      // Sort by confidence (high to low), then by amount (high to low)
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.amount - a.amount;
    });
  }, [uncategorizedTransactions, categorizationLearner]);

  const filteredSuggestions = useMemo(() => {
    if (showHighConfidenceOnly) {
      return transactionsWithSuggestions.filter(t => t.confidence > 0.7);
    }
    return transactionsWithSuggestions;
  }, [transactionsWithSuggestions, showHighConfidenceOnly]);

  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredSuggestions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredSuggestions.map(t => t.id)));
    }
  };

  const handleBulkCategorize = () => {
    if (bulkCategory && selectedTransactions.size > 0) {
      onCategorize(Array.from(selectedTransactions), bulkCategory);
      setSelectedTransactions(new Set());
      setBulkCategory('');
    }
  };

  const handleSingleCategorize = (transactionId: string, category: string) => {
    onCategorize([transactionId], category);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600 bg-green-50';
    if (confidence > 0.6) return 'text-yellow-600 bg-yellow-50';
    if (confidence > 0.4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence > 0.8) return 'Very High';
    if (confidence > 0.6) return 'High';
    if (confidence > 0.4) return 'Medium';
    return 'Low';
  };

  if (uncategorizedTransactions.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-[#dcd0b9]">
        <h3 className="text-lg font-black text-[#062c1a] mb-4">Smart Categorization</h3>
        <p className="text-[#8c7851]">All transactions are categorized! Great job keeping your finances organized.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#dcd0b9]">
      <div className="p-6 border-b border-[#dcd0b9]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-[#062c1a]">Smart Categorization</h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-[#8c7851]">
              <input
                type="checkbox"
                checked={showHighConfidenceOnly}
                onChange={(e) => setShowHighConfidenceOnly(e.target.checked)}
                className="rounded border-[#c5a059]"
              />
              High confidence only
            </label>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-[#8c7851]">
          <span>{uncategorizedTransactions.length} uncategorized transactions</span>
          <span>{filteredSuggestions.length} shown</span>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTransactions.size > 0 && (
        <div className="p-4 bg-[#fdfaf3] border-b border-[#dcd0b9]">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#062c1a]">
              {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
            </span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="px-3 py-2 border border-[#dcd0b9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
            >
              <option value="">Select category...</option>
              <option value="Food & Drink">Food & Drink</option>
              <option value="Housing">Housing</option>
              <option value="Transport">Transport</option>
              <option value="Shopping">Shopping</option>
              <option value="Fun & Hobbies">Fun & Hobbies</option>
              <option value="Bills & Utilities">Bills & Utilities</option>
              <option value="Wellness & Health">Wellness & Health</option>
              <option value="Money & Finance">Money & Finance</option>
              <option value="Education">Education</option>
              <option value="Travel">Travel</option>
              <option value="Work">Work</option>
              <option value="Account Transfer">Account Transfer</option>
            </select>
            <button
              onClick={handleBulkCategorize}
              disabled={!bulkCategory}
              className="px-4 py-2 bg-[#062c1a] text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2d1810] transition-colors"
            >
              Categorize Selected
            </button>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="max-h-96 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={selectedTransactions.size === filteredSuggestions.length}
              onChange={handleSelectAll}
              className="rounded border-[#c5a059]"
            />
            <span className="text-sm font-medium text-[#062c1a]">Select All</span>
          </div>

          <div className="space-y-3">
            {filteredSuggestions.map((transaction) => (
              <div
                key={transaction.id}
                className={`p-4 border rounded-lg transition-all ${
                  selectedTransactions.has(transaction.id)
                    ? 'border-[#c5a059] bg-[#fdfaf3]'
                    : 'border-[#dcd0b9] hover:border-[#8c7851]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => handleTransactionSelect(transaction.id)}
                    className="mt-1 rounded border-[#c5a059]"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#062c1a] truncate">
                          {transaction.merchantName || transaction.description}
                        </p>
                        <p className="text-sm text-[#8c7851] truncate">
                          {transaction.description}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-black text-[#062c1a]">
                          ${transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-[#8c7851]">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {transaction.suggestedCategory && (
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(transaction.confidence)}`}>
                            {getConfidenceLabel(transaction.confidence)} confidence
                          </span>
                          <span className="text-sm text-[#062c1a]">
                            Suggested: <span className="font-medium">{transaction.suggestedCategory}</span>
                          </span>
                        </div>
                        <button
                          onClick={() => handleSingleCategorize(transaction.id, transaction.suggestedCategory!)}
                          className="px-3 py-1 text-xs bg-[#c5a059] text-white rounded-lg hover:bg-[#8c7851] transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartCategorizationSuggestions;
