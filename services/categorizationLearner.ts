interface CategoryPattern {
  pattern: string;
  category: string;
  confidence: number;
  lastSeen: string;
  usageCount: number;
}

interface CategorizationMemory {
  patterns: CategoryPattern[];
  merchantPatterns: Map<string, string>;
}

class CategorizationLearner {
  private memoryKey = 'teller_categorization_memory';
  private memory: CategorizationMemory;

  constructor() {
    this.memory = this.loadMemory();
  }

  private loadMemory(): CategorizationMemory {
    try {
      const saved = localStorage.getItem(this.memoryKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          patterns: parsed.patterns || [],
          merchantPatterns: new Map(parsed.merchantPatterns || [])
        };
      }
    } catch (error) {
      console.warn('Failed to load categorization memory:', error);
    }
    
    return {
      patterns: [],
      merchantPatterns: new Map()
    };
  }

  private saveMemory(): void {
    try {
      const toSave = {
        patterns: this.memory.patterns,
        merchantPatterns: Array.from(this.memory.merchantPatterns.entries())
      };
      localStorage.setItem(this.memoryKey, JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save categorization memory:', error);
    }
  }

  learnFromTransaction(description: string, merchantName: string | undefined, category: string): void {
    if (category === 'Uncategorized' || category === 'Categorizing...') return;

    // Learn from merchant name if available
    if (merchantName) {
      const merchantKey = merchantName.toLowerCase().trim();
      if (!this.memory.merchantPatterns.has(merchantKey)) {
        this.memory.merchantPatterns.set(merchantKey, category);
        this.saveMemory();
      }
    }

    // Learn from description patterns
    this.learnFromDescription(description, category);
  }

  private learnFromDescription(description: string, category: string): void {
    const desc = description.toLowerCase();
    const words = desc.split(/\s+/).filter(word => word.length > 2);
    
    // Create n-grams (1-3 word combinations)
    const ngrams: string[] = [];
    
    // Single words
    ngrams.push(...words);
    
    // 2-grams
    for (let i = 0; i < words.length - 1; i++) {
      ngrams.push(`${words[i]} ${words[i + 1]}`);
    }
    
    // 3-grams
    for (let i = 0; i < words.length - 2; i++) {
      ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }

    // Update or create patterns
    ngrams.forEach(ngram => {
      if (ngram.length < 3) return; // Skip very short patterns
      
      const existingPattern = this.memory.patterns.find(p => p.pattern === ngram);
      
      if (existingPattern) {
        existingPattern.usageCount++;
        existingPattern.lastSeen = new Date().toISOString();
        // Increase confidence based on repeated usage
        existingPattern.confidence = Math.min(0.95, existingPattern.confidence + 0.05);
      } else {
        this.memory.patterns.push({
          pattern: ngram,
          category,
          confidence: 0.3, // Start with moderate confidence
          lastSeen: new Date().toISOString(),
          usageCount: 1
        });
      }
    });

    // Keep only the best patterns (max 500)
    this.memory.patterns.sort((a, b) => b.confidence * b.usageCount - a.confidence * a.usageCount);
    this.memory.patterns = this.memory.patterns.slice(0, 500);
    
    this.saveMemory();
  }

  suggestCategory(description: string, merchantName: string | undefined): { category: string; confidence: number } | null {
    // First check merchant patterns (highest confidence)
    if (merchantName) {
      const merchantKey = merchantName.toLowerCase().trim();
      const merchantCategory = this.memory.merchantPatterns.get(merchantKey);
      if (merchantCategory) {
        return { category: merchantCategory, confidence: 0.9 };
      }
    }

    // Then check description patterns
    const desc = description.toLowerCase();
    const words = desc.split(/\s+/).filter(word => word.length > 2);
    
    let bestMatch: { category: string; confidence: number } | null = null;
    
    // Check all patterns against the description
    this.memory.patterns.forEach(pattern => {
      if (desc.includes(pattern.pattern)) {
        if (!bestMatch || pattern.confidence > bestMatch.confidence) {
          bestMatch = {
            category: pattern.category,
            confidence: pattern.confidence
          };
        }
      }
    });

    return bestMatch;
  }

  getStats(): { totalPatterns: number; merchantPatterns: number; topCategories: Array<{ category: string; count: number }> } {
    const categoryCounts = new Map<string, number>();
    this.memory.patterns.forEach(pattern => {
      categoryCounts.set(pattern.category, (categoryCounts.get(pattern.category) || 0) + 1);
    });

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalPatterns: this.memory.patterns.length,
      merchantPatterns: this.memory.merchantPatterns.size,
      topCategories
    };
  }

  clearMemory(): void {
    this.memory = {
      patterns: [],
      merchantPatterns: new Map()
    };
    localStorage.removeItem(this.memoryKey);
  }

  exportMemory(): string {
    return JSON.stringify({
      patterns: this.memory.patterns,
      merchantPatterns: Array.from(this.memory.merchantPatterns.entries()),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  importMemory(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (imported.patterns && Array.isArray(imported.patterns)) {
        this.memory.patterns = imported.patterns;
      }
      if (imported.merchantPatterns && Array.isArray(imported.merchantPatterns)) {
        this.memory.merchantPatterns = new Map(imported.merchantPatterns);
      }
      this.saveMemory();
      return true;
    } catch (error) {
      console.error('Failed to import categorization memory:', error);
      return false;
    }
  }
}

export default CategorizationLearner;
