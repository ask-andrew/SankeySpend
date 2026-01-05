export const guessCategoryFromDescription = (description: string): string | undefined => {
  const d = description.toLowerCase();
  
  // Transport (checked before Housing so things like rental cars hit Transport)
  // Use word boundaries for "uber" and "bus" so we don't match "UberEATS" or "business"
  if (/(?:\buber\b|lyft|taxi|cab|\bbus\b|train|metro|subway|tram|transit)/.test(d)) return 'Transport';
  if (/gas|gasoline|fuel|shell|chevron|exxon|bp|petrol/.test(d)) return 'Transport';
  if (/parking|toll|ezpass|fasttrack|metrocard/.test(d)) return 'Transport';
  if (/car rental|enterprise|hertz|avis|budget|zipcar/.test(d)) return 'Transport';
  
  // Housing
  if (/rent|landlord|mortgage|hoa|property tax|home insurance|maintenance|repair/.test(d)) return 'Housing';
  
  // Food & Drink
  if (/grocery|supermarket|market|whole foods|trader joe|safeway|kroger|walmart grocery|target grocery/.test(d)) return 'Food & Drink';
  if (/coffee|cafe|starbucks|dunkin|peet's|caribou|tim hortons/.test(d)) return 'Food & Drink';
  if (/restaurant|dinner|lunch|breakfast|food|takeout|delivery|doordash|ubereats|grubhub/.test(d)) return 'Food & Drink';
  if (/mcdonald|burger king|wendy|taco bell|kfc|subway|chipotle/.test(d)) return 'Food & Drink';
  
  // Bills & Utilities - Enhanced with more utility keywords
  if (/netflix|spotify|hulu|disney|max|amazon prime|apple tv|youtube tv|paramount\+|peacock/.test(d)) return 'Bills & Utilities';
  if (/electric|gas bill|water|sewer|trash|recycling|utilities|utility/.test(d)) return 'Bills & Utilities';
  if (/internet|wifi|comcast|verizon|att|spectrum|cox|charter|optimum|fios/.test(d)) return 'Bills & Utilities';
  if (/phone|mobile|cellular|verizon|att|t-mobile|sprint|mint|cricket|boost/.test(d)) return 'Bills & Utilities';
  if (/insurance|health ins|car ins|life ins|home ins|renters ins/.test(d)) return 'Bills & Utilities';
  if (/subscription|recurring|monthly|annual|membership/.test(d)) return 'Bills & Utilities';
  if (/electricity|power|energy|heating|cooling|hvac|propane|oil delivery/.test(d)) return 'Bills & Utilities';
  if (/cable|satellite|streaming|entertainment/.test(d)) return 'Bills & Utilities';
  
  // Wellness & Health
  if (/gym|fitness|yoga|crossfit|planet fitness|la fitness|24 hour/.test(d)) return 'Wellness & Health';
  if (/clinic|hospital|doctor|dentist|pharmacy|cvs|walgreens|rite aid/.test(d)) return 'Wellness & Health';
  if (/medical|health|wellness|therapy|chiropractor/.test(d)) return 'Wellness & Health';
  
  // Shopping
  if (/amazon|target|walmart|best buy|costco|sam's club|home depot|lowe's/.test(d)) return 'Shopping';
  if (/clothing|apparel|nike|adidas|gap|old navy|h&m|zara|forever 21/.test(d)) return 'Shopping';
  if (/electronics|apple|samsung|sony|microsoft|best buy|micro center/.test(d)) return 'Shopping';
  if (/furniture|ikea|wayfair|ashley|pottery barn/.test(d)) return 'Shopping';
  
  // Travel
  if (/flight|airlines|southwest|delta|american|united|jetblue|spirit/.test(d)) return 'Travel';
  if (/hotel|marriott|hilton|holiday inn|best western|airbnb|vrbo/.test(d)) return 'Travel';
  if (/expedia|booking|priceline|kayak|tripadvisor/.test(d)) return 'Travel';
  
  // Fun & Hobbies
  if (/movie|cinema|theater|amc|regal|ticketmaster|eventbrite/.test(d)) return 'Fun & Hobbies';
  if (/gaming|steam|playstation|xbox|nintendo|epic games/.test(d)) return 'Fun & Hobbies';
  if (/sports|gym|fitness|yoga|crossfit|planet fitness|la fitness/.test(d)) return 'Fun & Hobbies';
  if (/concert|show|festival|music|spotify|apple music|pandora/.test(d)) return 'Fun & Hobbies';
  
  // Money & Finance
  if (/bank fee|atm fee|overdraft|interest charge|late fee/.test(d)) return 'Money & Finance';
  if (/investment|stock|e\*?trade|etrade|fidelity|charles schwab|robinhood/.test(d)) return 'Money & Finance';
  if (/tax|irs|state tax|federal tax|property tax/.test(d)) return 'Money & Finance';
  
  // Education
  if (/tuition|college|university|school|education|coursera|udemy|skillshare/.test(d)) return 'Education';
  if (/book|textbook|library|course|class|lesson/.test(d)) return 'Education';
  
  // Work
  if (/salary|payroll|paycheck|wages|income|commission|bonus/.test(d)) return 'Income';
  if (/office supplies|business expense|work|job|career/.test(d)) return 'Work';
  
  // Account Transfer - Enhanced with more transfer patterns
  if (/transfer|payment to|cc payment|credit card payment|ach|direct deposit|wire transfer/.test(d)) return 'Account Transfer';
  if (/venmo|paypal|cash app|zelle|square|apple pay|google pay|samsung pay/.test(d)) return 'Account Transfer';
  if (/xfer|trx|trnsf|p2p|person to person/.test(d)) return 'Account Transfer';
  if (/internal transfer|account to account|savings to checking|checking to savings/.test(d)) return 'Account Transfer';
  if (/(?:^|\b)payment from|deposit from|received from|incoming/.test(d)) return 'Account Transfer';
  if (/(?:^|\b)sent|paid|outgoing|withdrawal|debit/.test(d)) return 'Account Transfer';
  
  return undefined;
};

// New function for bulk keyword matching
export const getTransactionsByKeyword = (transactions: any[], keyword: string): any[] => {
  const lowerKeyword = keyword.toLowerCase();
  return transactions.filter(transaction => {
    const description = (transaction.description || '').toLowerCase();
    const merchantName = (transaction.merchantName || '').toLowerCase();
    return description.includes(lowerKeyword) || merchantName.includes(lowerKeyword);
  });
};

// New function for smart bulk categorization by keyword
export const suggestBulkCategoryByKeyword = (keyword: string): string | undefined => {
  return guessCategoryFromDescription(keyword);
};

// New function to get common utility keywords
export const getUtilityKeywords = (): string[] => {
  return [
    'electric', 'gas', 'water', 'sewer', 'trash', 'recycling', 'internet', 'wifi',
    'phone', 'mobile', 'cellular', 'netflix', 'spotify', 'hulu', 'disney', 'max',
    'subscription', 'recurring', 'insurance', 'utilities', 'cable', 'streaming'
  ];
};

// New function to get transfer keywords
export const getTransferKeywords = (): string[] => {
  return [
    'transfer', 'venmo', 'paypal', 'cash app', 'zelle', 'square', 'payment',
    'ach', 'direct deposit', 'wire', 'xfer', 'p2p', 'internal', 'account to'
  ];
};
