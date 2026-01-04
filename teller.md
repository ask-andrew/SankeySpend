# Prompt for Gemini AI Studio: Building Advanced Financial Visualizations for Teller

## Context
You are building advanced financial visualizations for **Teller**, a privacy-first personal finance app. The app processes bank CSV transactions entirely client-side (no server uploads). The design aesthetic is **vintage banking** (mahogany wood, brass accents, cream paper backgrounds).

## Your Mission
Build 5 powerhouse visualizations that make users say "HOLY SH*T, I never saw my money this way!" Mix expected calculations with mind-blowing financial wizard insights that celebrate wins and inspire better money habits.

---

## Technical Stack & Constraints

### Available Libraries
- React with TypeScript
- recharts (BarChart, LineChart, AreaChart, RadarChart, PieChart, ResponsiveContainer)
- Existing custom SankeyChart component
- Tailwind CSS for styling
- Font Awesome icons (via `<i className="fas fa-...">`)

### Color Palette (Must Use)
```javascript
const COLORS = [
  '#062c1a', // Deep forest green
  '#2d1810', // Mahogany
  '#c5a059', // Brass/gold
  '#634b3e', // Leather brown
  '#8c7851', // Aged tan
  '#dcd0b9', // Cream borders
  '#fdfaf3', // Paper white
  '#e8e1d4'  // Light cream
];
```

### Transaction Type Structure
```typescript
interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD format
  description: string;
  amount: number; // Always positive
  category: string; // e.g., "Food & Drink", "Housing", "Transport"
  subCategory?: string;
  merchantName?: string;
  isIncome: boolean;
  isInternalTransfer?: boolean; // Credit card payments
  source: string; // Filename
}
```

### Design System Rules
- Cards: `bg-white rounded-3xl shadow-xl border border-[#dcd0b9] p-12`
- Headers: `text-2xl font-black text-[#062c1a] serif italic`
- Subheaders: `text-xs text-[#8c7851] font-bold uppercase tracking-widest`
- Icons: Wrapped in colored circles with shadows
- Buttons: `brass-button` class (already defined in CSS)

---

## 🎯 THE 5 VISUALIZATIONS TO BUILD

### 1. **The Cash Flow Waterfall: "Where Every Dollar Goes"** ⭐ START HERE
**Goal:** Show money flowing down through spending decisions with 3 parallel timelines

**Required Components:**
- Main waterfall showing: Starting Balance → Essentials → Discretionary → Savings
- 3 side-by-side scenarios:
  1. **Your Reality** (actual spending)
  2. **Without Regret** (minus late-night/impulse purchases)
  3. **Your Best Self** (based on your best month)

**Advanced Calculations Needed:**
```typescript
// 1. Detect regrettable spending
const detectRegrettableSpending = (transactions: Transaction[]) => {
  // Find late-night purchases (if time data available in description)
  // Find rapid-fire purchases (multiple transactions within 30 min)
  // Find weekend + dining + bar patterns
  // Return total amount that could be saved
}

// 2. Find user's "best month"
const findBestMonth = (transactions: Transaction[]) => {
  // Group by month
  // Calculate savings rate for each: (income - spending) / income
  // Return the month with highest savings rate
}

// 3. Opportunity cost calculator
const calculateOpportunityCost = (savedAmount: number) => {
  // Show what savings could become:
  // - In 1 year
  // - In 5 years at 5% interest
  // - In 10 years at 7% interest
  // - Equivalent real-world items (vacations, laptops, etc.)
}
```

**Visual Requirements:**
- Use recharts BarChart with custom bars showing flow
- Color code: Green (positive), Red (spending), Blue (savings)
- Animate bars growing from left to right
- Show delta between scenarios with arrows
- Add "What if you..." section with actionable suggestions

**Celebration Moment:**
If user's reality matches "Best Self" within 10%, show confetti animation and message: "🎉 You're living your best financial life!"

---

### 2. **The Financial Fingerprint Radar: "Your Money Personality"**
**Goal:** 8-dimensional radar chart showing unique spending patterns

**8 Dimensions to Calculate:**

```typescript
// 1. Impulsivity Score (0-100)
const calculateImpulsivity = (transactions: Transaction[]) => {
  const smallTxCount = transactions.filter(t => t.amount < 25).length;
  const totalTxCount = transactions.length;
  return (smallTxCount / totalTxCount) * 100;
}

// 2. Weekend Effect (-100 to +100)
const calculateWeekendEffect = (transactions: Transaction[]) => {
  const weekdaySpend = transactions.filter(t => 
    [1,2,3,4,5].includes(new Date(t.date).getDay())
  ).reduce((sum, t) => sum + t.amount, 0);
  
  const weekendSpend = transactions.filter(t =>
    [0,6].includes(new Date(t.date).getDay())
  ).reduce((sum, t) => sum + t.amount, 0);
  
  const weekdayAvg = weekdaySpend / 5;
  const weekendAvg = weekendSpend / 2;
  
  return ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;
}

// 3. Essential Ratio (0-100)
const calculateEssentialRatio = (transactions: Transaction[]) => {
  const essentialCategories = ['Housing', 'Bills & Utilities', 'Transport', 'Food & Drink'];
  const essentialSpend = transactions.filter(t => 
    essentialCategories.includes(t.category)
  ).reduce((sum, t) => sum + t.amount, 0);
  
  const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
  return (essentialSpend / totalSpend) * 100;
}

// 4. Merchant Loyalty (0-100) - Herfindahl Index
const calculateMerchantConcentration = (transactions: Transaction[]) => {
  const merchantTotals = new Map<string, number>();
  let total = 0;
  
  transactions.forEach(t => {
    const merchant = t.merchantName || t.description;
    merchantTotals.set(merchant, (merchantTotals.get(merchant) || 0) + t.amount);
    total += t.amount;
  });
  
  let herfindahl = 0;
  merchantTotals.forEach(amount => {
    const share = (amount / total) * 100;
    herfindahl += share * share;
  });
  
  return Math.min(100, herfindahl / 100); // Normalize to 0-100
}

// 5. Subscription Burden (0-100)
const calculateSubscriptionBurden = (transactions: Transaction[]) => {
  const subscriptionKeywords = ['subscription', 'monthly', 'netflix', 'spotify', 'gym', 'prime'];
  const subTotal = transactions.filter(t =>
    subscriptionKeywords.some(kw => t.description.toLowerCase().includes(kw))
  ).reduce((sum, t) => sum + t.amount, 0);
  
  const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
  return (subTotal / totalSpend) * 100;
}

// 6. Digital vs Physical (0-100, 0=all physical, 100=all digital)
const calculateDigitalRatio = (transactions: Transaction[]) => {
  const digitalKeywords = ['amazon', 'online', 'app', '.com', 'digital', 'download'];
  const digitalSpend = transactions.filter(t =>
    digitalKeywords.some(kw => t.description.toLowerCase().includes(kw))
  ).reduce((sum, t) => sum + t.amount, 0);
  
  const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
  return (digitalSpend / totalSpend) * 100;
}

// 7. Spending Consistency (0-100, higher = more consistent)
const calculateConsistency = (transactions: Transaction[]) => {
  const dailyTotals = new Map<string, number>();
  transactions.forEach(t => {
    dailyTotals.set(t.date, (dailyTotals.get(t.date) || 0) + t.amount);
  });
  
  const amounts = Array.from(dailyTotals.values());
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100; // Coefficient of variation
  
  return Math.max(0, 100 - cv); // Lower CV = higher consistency
}

// 8. Cash Flow Timing (0-100, higher = better float usage)
const calculateFloatUsage = (transactions: Transaction[]) => {
  const creditCardTx = transactions.filter(t => t.source.toLowerCase().includes('credit'));
  const payments = transactions.filter(t => t.isInternalTransfer);
  
  if (payments.length === 0) return 0;
  
  let totalFloat = 0;
  let floatCount = 0;
  
  creditCardTx.forEach(charge => {
    const payment = payments.find(p => 
      Math.abs(p.amount - charge.amount) < 0.01 &&
      new Date(p.date) > new Date(charge.date)
    );
    
    if (payment) {
      const days = (new Date(payment.date).getTime() - new Date(charge.date).getTime()) / (1000 * 60 * 60 * 24);
      totalFloat += days;
      floatCount++;
    }
  });
  
  const avgFloat = floatCount > 0 ? totalFloat / floatCount : 0;
  return Math.min(100, (avgFloat / 30) * 100); // 30 days = 100%
}
```

**Visual Requirements:**
- Use recharts RadarChart with all 8 dimensions
- Color fill: `rgba(197, 160, 89, 0.3)` (brass with transparency)
- Color stroke: `#c5a059` (brass)
- Show interpretation for each dimension
- Add "Your Money Archetype" based on highest scores:
  - High Impulsivity + High Weekend = "Weekend Warrior"
  - High Loyalty + High Consistency = "Creature of Habit"
  - High Digital + High Subscription = "Digital Native"
  - High Essential + Low Impulsivity = "The Pragmatist"

**Celebration Moment:**
For each dimension above 70, show a badge: "🏆 Master of [Dimension]"

---

### 3. **The Habit Tax Calculator: "The True Cost of Daily Habits"**
**Goal:** Show compound cost of small daily habits over 1, 5, 10, and 30 years

**Habits to Track:**
```typescript
const HABITS = [
  { name: 'Daily Coffee', keywords: ['starbucks', 'coffee', 'cafe'], icon: '☕' },
  { name: 'Lunch Out', keywords: ['lunch', 'chipotle', 'subway', 'panera'], icon: '🥗' },
  { name: 'Ride Share', keywords: ['uber', 'lyft'], icon: '🚗' },
  { name: 'Food Delivery', keywords: ['doordash', 'uber eats', 'grubhub'], icon: '🍔' },
  { name: 'Impulse Amazon', keywords: ['amazon'], icon: '📦' },
  { name: 'Bar/Drinks', keywords: ['bar', 'brewery', 'wine', 'liquor'], icon: '🍺' }
];

const calculateHabitTax = (transactions: Transaction[], habit: Habit) => {
  const matches = transactions.filter(t =>
    habit.keywords.some(kw => t.description.toLowerCase().includes(kw))
  );
  
  if (matches.length === 0) return null;
  
  const totalSpent = matches.reduce((sum, t) => sum + t.amount, 0);
  const frequency = matches.length;
  
  // Calculate projections
  const monthsInData = getUniqueMonths(transactions);
  const monthlyRate = frequency / monthsInData;
  const monthlySpend = totalSpent / monthsInData;
  const annualSpend = monthlySpend * 12;
  
  // Compound interest calculations (if invested instead)
  const oneYear = annualSpend;
  const fiveYears = calculateFutureValue(annualSpend, 0.05, 5);
  const tenYears = calculateFutureValue(annualSpend, 0.07, 10);
  const thirtyYears = calculateFutureValue(annualSpend, 0.07, 30);
  
  return {
    habit: habit.name,
    icon: habit.icon,
    frequency: Math.round(monthlyRate),
    monthlySpend,
    annualSpend,
    oneYear,
    fiveYears,
    tenYears,
    thirtyYears,
    equivalents: getEquivalents(annualSpend)
  };
}

const calculateFutureValue = (annualPayment: number, rate: number, years: number) => {
  // Future value of annuity formula
  return annualPayment * (((Math.pow(1 + rate, years) - 1) / rate) * (1 + rate));
}

const getEquivalents = (annualAmount: number) => {
  const equivalents = [
    { item: 'Spotify Premium subscriptions', cost: 144, emoji: '🎵' },
    { item: 'Nice restaurant dinners', cost: 100, emoji: '🍽️' },
    { item: 'Weekend getaway trips', cost: 500, emoji: '✈️' },
    { item: 'Brand new Macbook Pros', cost: 2000, emoji: '💻' },
    { item: 'Used Honda Civics', cost: 15000, emoji: '🚗' }
  ];
  
  return equivalents
    .filter(e => annualAmount >= e.cost)
    .map(e => ({
      ...e,
      count: Math.floor(annualAmount / e.cost)
    }));
}
```

**Visual Requirements:**
- Create a card for each detected habit
- Show timeline bars: 1yr → 5yr → 10yr → 30yr (logarithmic scale for drama)
- Use animated number counters that tick up
- Show "That's equivalent to..." section with emoji equivalents
- Color code by severity:
  - < $500/year: Green (manageable)
  - $500-$2000/year: Yellow (worth reviewing)
  - > $2000/year: Red (significant impact)

**Celebration Moment:**
If user has NO habits over $1000/year: "🎉 You're habit-tax free! Your daily spending is under control."

---

### 4. **The Pareto Principle: "Your 80/20 Money Map"**
**Goal:** Find the 20% of merchants/categories that represent 80% of spending

**Calculations:**
```typescript
const findPareto = (transactions: Transaction[]) => {
  // Group by merchant
  const merchantTotals = new Map<string, number>();
  transactions.forEach(t => {
    const merchant = t.merchantName || t.description;
    merchantTotals.set(merchant, (merchantTotals.get(merchant) || 0) + t.amount);
  });
  
  // Sort by total spending
  const sorted = Array.from(merchantTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  
  // Find 80% threshold
  const totalSpend = sorted.reduce((sum, m) => sum + m.total, 0);
  const eightyPercent = totalSpend * 0.8;
  
  let cumulative = 0;
  let count = 0;
  const topMerchants = [];
  
  while (cumulative < eightyPercent && count < sorted.length) {
    cumulative += sorted[count].total;
    topMerchants.push({
      ...sorted[count],
      percentage: (sorted[count].total / totalSpend) * 100,
      cumulative: (cumulative / totalSpend) * 100
    });
    count++;
  }
  
  return {
    merchants: topMerchants,
    percentage: (count / sorted.length) * 100,
    insight: `Just ${count} merchants (${Math.round((count / sorted.length) * 100)}%) represent 80% of your spending. Focus here to make the biggest impact.`
  };
}

// Also calculate by category
const findParetoByCategory = (transactions: Transaction[]) => {
  // Same logic but group by category instead
}
```

**Visual Requirements:**
- Two charts side-by-side: By Merchant | By Category
- Use recharts BarChart with cumulative line overlay
- Bars show individual amounts, line shows cumulative %
- Highlight the "80% line" with annotation
- Show TOP 5 merchants/categories in a special callout card
- Use gradient fills for visual interest

**Celebration Moment:**
If user has diverse spending (30+ merchants in 80%): "🌟 Diverse Spender: Your money supports many businesses!"

---

### 5. **The Lifestyle Inflation Detector: "Are You Spending More?"**
**Goal:** Track if spending is creeping up over time and identify the culprits

**Calculations:**
```typescript
const detectLifestyleInflation = (transactions: Transaction[]) => {
  // Group by month
  const monthlyData = new Map<string, Transaction[]>();
  transactions.forEach(t => {
    const monthKey = t.date.substring(0, 7); // YYYY-MM
    if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, []);
    monthlyData.get(monthKey)!.push(t);
  });
  
  const sorted = Array.from(monthlyData.entries()).sort();
  if (sorted.length < 3) return null;
  
  // Compare first 3 months vs last 3 months
  const earlyMonths = sorted.slice(0, 3);
  const recentMonths = sorted.slice(-3);
  
  const earlyAvg = earlyMonths.reduce((sum, [_, txs]) => 
    sum + txs.reduce((s, t) => s + t.amount, 0), 0
  ) / earlyMonths.length;
  
  const recentAvg = recentMonths.reduce((sum, [_, txs]) =>
    sum + txs.reduce((s, t) => s + t.amount, 0), 0
  ) / recentMonths.length;
  
  const inflationRate = ((recentAvg - earlyAvg) / earlyAvg) * 100;
  
  // Find which categories increased most
  const categoryChanges = new Map<string, number>();
  
  const categories = Array.from(new Set(transactions.map(t => t.category)));
  categories.forEach(cat => {
    const earlySpend = earlyMonths.reduce((sum, [_, txs]) =>
      sum + txs.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0), 0
    ) / earlyMonths.length;
    
    const recentSpend = recentMonths.reduce((sum, [_, txs]) =>
      sum + txs.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0), 0
    ) / recentMonths.length;
    
    if (earlySpend > 0) {
      const change = ((recentSpend - earlySpend) / earlySpend) * 100;
      categoryChanges.set(cat, change);
    }
  });
  
  const sortedChanges = Array.from(categoryChanges.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return {
    inflationRate,
    earlyAvg,
    recentAvg,
    monthlyIncrease: recentAvg - earlyAvg,
    annualImpact: (recentAvg - earlyAvg) * 12,
    topIncreases: sortedChanges,
    trend: sorted.map(([month, txs]) => ({
      month,
      total: txs.reduce((sum, t) => sum + t.amount, 0)
    }))
  };
}
```

**Visual Requirements:**
- Line chart showing monthly spending trend with regression line
- Color the regression line: Green (decreasing), Yellow (stable), Red (increasing >15%)
- Show "Early You" vs "Recent You" comparison cards
- Bar chart of top 5 categories driving inflation
- Calculate "If this continues..." projection for next year
- Add actionable insight: "Your [category] spending is up 40%. Consider [specific action]."

**Celebration Moment:**
If inflation rate < 5% or negative: "🎉 Spending Champion! You're keeping lifestyle inflation in check."
If inflation rate > 20%: "⚠️ Wake-up call: Your spending has increased 20%+ recently. Let's explore why."

---

## 🎨 OVERALL UI/UX REQUIREMENTS

### Layout Structure
Create a new tab called **"Money Insights"** that contains all 5 visualizations:

```typescript
<div className="space-y-12 p-12 max-w-7xl mx-auto">
  {/* Hero Card */}
  <div className="bg-gradient-to-br from-[#062c1a] to-[#2d1810] text-white p-16 rounded-3xl">
    <h1 className="text-5xl font-black serif italic mb-4">Your Financial Intelligence Report</h1>
    <p className="text-amber-100/60 text-lg">Deep insights from {transactions.length} transactions</p>
  </div>

  {/* Cash Flow Waterfall */}
  <section>...</section>

  {/* Financial Fingerprint Radar */}
  <section>...</section>

  {/* Habit Tax Calculator */}
  <section>...</section>

  {/* Pareto Principle */}
  <section>...</section>

  {/* Lifestyle Inflation */}
  <section>...</section>
</div>
```

### Interaction Patterns
- **Hover**: Show detailed tooltips with exact numbers
- **Click**: Drill down to transaction list filtered by that segment
- **Toggle**: Allow switching between time periods (3mo, 6mo, 1yr, all time)
- **Animate**: Use react-spring or CSS animations for numbers counting up

### Celebration System
Create a `<CelebrationModal>` component that triggers when:
- User achieves savings goals
- User successfully reduces a habit by 50%
- User maintains consistent spending for 3+ months
- User's "Best Self" scenario matches reality

Modal should include:
- Confetti animation (use `canvas-confetti` library if available, or CSS animation)
- Encouraging message
- Specific achievement badge
- Social share text (for clipboard, not actual social media)

### Empty States
If insufficient data for a visualization:
```tsx
<div className="bg-amber-50 border-2 border-amber-200 p-12 rounded-3xl text-center">
  <i className="fas fa-clock text-5xl text-amber-400 mb-4"></i>
  <h3 className="text-xl font-bold text-amber-900 mb-2">Need More Time</h3>
  <p className="text-amber-700">Upload at least 3 months of data to see this insight</p>
</div>
```

---

## 🚀 IMPLEMENTATION INSTRUCTIONS

### Step 1: Create New Service File
Create `src/services/advancedAnalytics.ts` with all calculation functions

### Step 2: Create Visualization Components
Create individual components in `src/components/insights/`:
- `CashFlowWaterfall.tsx`
- `FinancialFingerprint.tsx`
- `HabitTaxCalculator.tsx`
- `ParetoAnalysis.tsx`
- `LifestyleInflationDetector.tsx`

### Step 3: Add Insights Tab
Modify `App.tsx` to add new tab:
```typescript
const [activeTab, setActiveTab] = useState<'home' | 'history' | 'assistant' | 'insights'>('home');
```

### Step 4: Add Navigation Button
In sidebar:
```tsx
<button 
  onClick={() => setActiveTab('insights')} 
  className={`... ${activeTab === 'insights' ? 'bg-[#c5a059]' : ''}`}
>
  <i className="fas fa-brain w-5"></i> Money Insights
</button>
```

---

## ✅ ACCEPTANCE CRITERIA

Each visualization must:
1. ✅ Work with as few as 10 transactions (graceful degradation)
2. ✅ Handle edge cases (no income, all expenses in one category, etc.)
3. ✅ Load in under 2 seconds with 10,000 transactions
4. ✅ Be fully responsive (mobile, tablet, desktop)
5. ✅ Include at least one "celebration moment" when user does well
6. ✅ Provide actionable insight, not just data visualization
7. ✅ Match the vintage banking aesthetic
8. ✅ Include "What This Means" explanation in plain English
9. ✅ Allow drill-down to see underlying transactions
10. ✅ Export as PNG or PDF (bonus)

---

## 🎯 SUCCESS METRICS

You've succeeded when:
- A user sees the insights and says "WHOA" out loud
- The visualization reveals something they didn't know about their spending
- The insight is specific enough to take action on
- The user feels motivated (not shamed) to improve
- The design feels premium and polished

---

## 📝 DELIVERABLE FORMAT

Provide:
1. **Complete TypeScript code** for all 5 visualizations
2. **The advancedAnalytics.ts service file** with all calculation functions
3. **Integration instructions** for adding to existing App.tsx
4. **Sample output** showing what each viz looks like with example data
5. **User-facing copy** for insights (the text that appears below each chart)

---

## 🔥 BONUS CHALLENGES

If you crush the above, add these:
- **Comparison Mode**: Let users compare any two time periods side-by-side
- **Goal Setting**: Let users set targets and track progress visually
- **Predictive Mode**: Use simple linear regression to predict next month's spending
- **Anomaly Detection**: Flag unusual transactions (outliers) with explanations
- **Seasonal Patterns**: Detect if user spends more in certain months (holidays, etc.)

---

## 💬 TONE & VOICE

All user-facing text should be:
- **Encouraging**, never judgmental
- **Specific**, not generic ("You spent 40% less on dining" not "Good job")
- **Actionable**, with next steps
- **Conversational**, like a wise friend
- **Vintage banking themed**, using words like "ledger", "vault", "treasury"

Example good copy:
> "Your spending ledger reveals a fascinating pattern: 73% of your treasury flows to just 3 merchants. By diversifying your spending habits, you'd gain more flexibility and potentially better value."

Example bad copy:
> "You spend too much at these stores. Try to spend less."

---

## 🎬 START HERE

Begin with **Cash Flow Waterfall** because it has the highest wow factor and is easiest to understand. Once that's perfect, move to Financial Fingerprint Radar, then the others.

**GO BUILD SOMETHING AMAZING!** 🚀