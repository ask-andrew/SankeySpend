import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import CategorizationLearner from '../services/categorizationLearner';
import { getTransactionsByKeyword, suggestBulkCategoryByKeyword, getUtilityKeywords, getTransferKeywords } from '../utils/categorizationUtils';

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
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [bulkKeyword, setBulkKeyword] = useState<string>('');
  const [showBulkKeywordSection, setShowBulkKeywordSection] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState<any[]>([]);
  const [previewCategory, setPreviewCategory] = useState<string>('');

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
    let filtered = transactionsWithSuggestions;
    
    // Filter by confidence
    if (showHighConfidenceOnly) {
      filtered = filtered.filter(t => t.confidence > 0.7);
    }
    
    // Filter by search keyword
    if (searchKeyword.trim()) {
      filtered = getTransactionsByKeyword(filtered, searchKeyword);
    }
    
    return filtered;
  }, [transactionsWithSuggestions, showHighConfidenceOnly, searchKeyword]);

  // Get matching transactions for bulk keyword
  const bulkKeywordMatches = useMemo(() => {
    if (!bulkKeyword.trim()) return [];
    return getTransactionsByKeyword(uncategorizedTransactions, bulkKeyword);
  }, [uncategorizedTransactions, bulkKeyword]);

  // Suggest category for bulk keyword
  const suggestedBulkCategory = useMemo(() => {
    if (!bulkKeyword.trim()) return '';
    return suggestBulkCategoryByKeyword(bulkKeyword) || '';
  }, [bulkKeyword]);

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

  const handleBulkCategorize = () => {
    if (bulkCategory && selectedTransactions.size > 0) {
      const selectedTrans = transactions.filter(t => selectedTransactions.has(t.id));
      setPreviewTransactions(selectedTrans);
      setPreviewCategory(bulkCategory);
      setShowPreviewModal(true);
    }
  };

  const handleBulkKeywordCategorize = () => {
    if (suggestedBulkCategory && bulkKeywordMatches.length > 0) {
      setPreviewTransactions(bulkKeywordMatches);
      setPreviewCategory(suggestedBulkCategory);
      setShowPreviewModal(true);
    }
  };

  const confirmBulkCategorize = () => {
    if (previewCategory && previewTransactions.length > 0) {
      onCategorize(previewTransactions.map(t => t.id), previewCategory);
      setShowPreviewModal(false);
      setPreviewTransactions([]);
      setPreviewCategory('');
      setSelectedTransactions(new Set());
      setBulkKeyword('');
      setBulkCategory('');
      setShowBulkKeywordSection(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredSuggestions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredSuggestions.map(t => t.id)));
    }
  };

  const handleSelectAllKeywordMatches = () => {
    const keywordMatchIds = new Set(bulkKeywordMatches.map(t => t.id));
    setSelectedTransactions(keywordMatchIds);
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
        
        {/* Search Box */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search transactions by keyword..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full px-4 py-2 border border-[#dcd0b9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
          />
        </div>

        {/* Bulk Keyword Section */}
        <div className="mb-4">
          <button
            onClick={() => setShowBulkKeywordSection(!showBulkKeywordSection)}
            className="text-sm font-medium text-[#062c1a] hover:text-[#8c7851] transition-colors"
          >
            {showBulkKeywordSection ? '▼' : '▶'} Bulk Categorize by Keyword
          </button>
          
          {showBulkKeywordSection && (
            <div className="mt-3 p-4 bg-[#fdfaf3] border border-[#dcd0b9] rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#062c1a] mb-2">
                    Keyword to match:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 'netflix', 'transfer', 'electric'..."
                    value={bulkKeyword}
                    onChange={(e) => setBulkKeyword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dcd0b9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                  />
                </div>
                
                {bulkKeyword && (
                  <div className="text-sm text-[#8c7851]">
                    Found {bulkKeywordMatches.length} matching transactions
                    {suggestedBulkCategory && (
                      <span className="ml-2">
                        → Suggested category: <span className="font-medium text-[#062c1a]">{suggestedBulkCategory}</span>
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  {bulkKeywordMatches.length > 0 && (
                    <>
                      <button
                        onClick={handleSelectAllKeywordMatches}
                        className="px-3 py-2 text-sm border border-[#c5a059] text-[#062c1a] rounded-lg hover:bg-[#fdfaf3] transition-colors"
                      >
                        Select All ({bulkKeywordMatches.length})
                      </button>
                      {suggestedBulkCategory && (
                        <button
                          onClick={handleBulkKeywordCategorize}
                          className="px-3 py-2 text-sm bg-[#c5a059] text-white rounded-lg hover:bg-[#8c7851] transition-colors"
                        >
                          Categorize All as {suggestedBulkCategory}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Quick keyword suggestions */}
                <div className="pt-2 border-t border-[#dcd0b9]">
                  <div className="text-xs text-[#8c7851] mb-2">Quick suggestions:</div>
                  <div className="flex flex-wrap gap-2">
                    {getUtilityKeywords().slice(0, 5).map(keyword => (
                      <button
                        key={keyword}
                        onClick={() => setBulkKeyword(keyword)}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        {keyword}
                      </button>
                    ))}
                    {getTransferKeywords().slice(0, 3).map(keyword => (
                      <button
                        key={keyword}
                        onClick={() => setBulkKeyword(keyword)}
                        className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
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

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto m-4">
            <h3 className="text-lg font-black text-[#062c1a] mb-4">
              Preview Bulk Categorization
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-[#8c7851] mb-2">
                Categorizing {previewTransactions.length} transaction{previewTransactions.length !== 1 ? 's' : ''} as:
              </p>
              <div className="px-3 py-2 bg-[#fdfaf3] border border-[#dcd0b9] rounded-lg">
                <span className="font-medium text-[#062c1a]">{previewCategory}</span>
              </div>
            </div>

            <div className="mb-4 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {previewTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-[#fdfaf3] border border-[#dcd0b9] rounded">
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
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewTransactions([]);
                  setPreviewCategory('');
                }}
                className="px-4 py-2 border border-[#dcd0b9] text-[#062c1a] rounded-lg hover:bg-[#fdfaf3] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkCategorize}
                className="px-4 py-2 bg-[#062c1a] text-white rounded-lg hover:bg-[#2d1810] transition-colors"
              >
                Confirm Categorization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCategorizationSuggestions;
