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
  
  // Bills & Utilities
  if (/netflix|spotify|hulu|disney|max|amazon prime|apple tv|youtube tv/.test(d)) return 'Bills & Utilities';
  if (/electric|gas bill|water|sewer|trash|recycling|utilities/.test(d)) return 'Bills & Utilities';
  if (/internet|wifi|comcast|verizon|att|spectrum|cox/.test(d)) return 'Bills & Utilities';
  if (/phone|mobile|cellular|verizon|att|t-mobile|sprint/.test(d)) return 'Bills & Utilities';
  if (/insurance|health ins|car ins|life ins/.test(d)) return 'Bills & Utilities';
  
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
  
  // Account Transfer
  if (/transfer|payment to|cc payment|credit card payment|ach|direct deposit/.test(d)) return 'Account Transfer';
  if (/venmo|paypal|cash app|zelle|square/.test(d)) return 'Account Transfer';
  
  return undefined;
};
