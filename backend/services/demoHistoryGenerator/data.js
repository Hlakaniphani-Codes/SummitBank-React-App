// data.js - Complete configuration
const MERCHANTS = {
  US: {
    groceries: ['Walmart', 'Kroger', 'Whole Foods', 'Trader Joe\'s', 'Publix', 'Safeway', 'Aldi', 'Costco', 'Target', 'Wegmans'],
    restaurants: ['McDonald\'s', 'Starbucks', 'Chipotle', 'Olive Garden', 'The Cheesecake Factory', 'Panera Bread', 'Subway', 'Taco Bell', 'Chick-fil-A', 'Dunkin\''],
    fuel: ['Chevron', 'Shell', 'ExxonMobil', 'BP', 'Speedway', '7-Eleven', 'Circle K', 'Sunoco', 'Marathon', 'Valero'],
    utilities: ['Duke Energy', 'PG&E', 'Consolidated Edison', 'National Grid', 'AT&T', 'Verizon', 'Comcast', 'Spectrum', 'Xfinity', 'Southern California Edison'],
    insurance: ['State Farm', 'Geico', 'Progressive', 'Allstate', 'Liberty Mutual', 'Nationwide', 'Farmers Insurance', 'USAA', 'Travelers', 'MetLife'],
    subscriptions: ['Netflix', 'Spotify', 'Apple Music', 'HBO Max', 'Disney+', 'Amazon Prime', 'Hulu', 'Zoom', 'Microsoft 365', 'Dropbox'],
    airlines: ['Delta Air Lines', 'American Airlines', 'United Airlines', 'Southwest Airlines', 'JetBlue', 'Alaska Airlines'],
    hotels: ['Hilton', 'Marriott', 'Hyatt', 'Sheraton', 'Holiday Inn', 'Best Western', 'Airbnb', 'Westin', 'Ritz-Carlton'],
    onlineRetail: ['Amazon', 'eBay', 'Best Buy', 'Home Depot', 'Lowe\'s', 'Macy\'s', 'Nordstrom', 'Gap', 'Nike', 'Adidas'],
    investments: ['Vanguard', 'Fidelity', 'Charles Schwab', 'Robinhood', 'E*TRADE', 'Merrill Lynch', 'TD Ameritrade', 'Wealthfront', 'Betterment'],
    banks: ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'US Bank', 'PNC Bank', 'TD Bank', 'Capital One'],
    misc: ['Uber', 'Lyft', 'DoorDash', 'Grubhub', 'IKEA', 'Sephora', 'PetSmart', 'Uber Eats', 'Instacart'],
    entertainment: ['AMC Theatres', 'Regal Cinemas', 'Ticketmaster', 'Live Nation', 'ESPN+', 'NBA League Pass'],
    tech: ['Apple Store', 'Microsoft', 'Google', 'Adobe', 'Salesforce', 'Oracle', 'Cisco', 'Dell'],
    businessServices: ['FedEx', 'UPS', 'DHL', 'Staples', 'Office Depot', 'WeWork', 'Regus', 'ADP', 'Paychex'],
    loans: ['SoFi', 'LendingClub', 'Prosper', 'Upstart', 'Rocket Loans', 'LightStream'],
    healthcare: ['CVS Pharmacy', 'Walgreens', 'Blue Cross Blue Shield', 'UnitedHealthcare', 'Kaiser Permanente', 'Mayo Clinic'],
  }
};

const BENEFICIARIES = {
  US: {
    utilities: ['Duke Energy', 'PG&E Corporation', 'Consolidated Edison Inc', 'National Grid USA', 'AT&T Services', 'Verizon Communications'],
    mortgage: ['Chase Mortgage', 'Wells Fargo Home Mortgage', 'Quicken Loans', 'Bank of America Home Loans', 'Rocket Mortgage'],
    investment: ['Vanguard Investments', 'Fidelity Management', 'Charles Schwab & Co', 'Merrill Lynch', 'Morgan Stanley'],
    insurance: ['State Farm Insurance', 'Geico Direct', 'Progressive Casualty', 'Allstate Insurance', 'Liberty Mutual'],
    family: ['Family Member Transfer', 'Spouse Account', 'Daughter Account', 'Son Account', 'Parent Account'],
    business: ['Supplier Payments Inc', 'Vendor Services LLC', 'Business Partner LTD', 'Contractor Services', 'Consulting Group'],
    payroll: ['Payroll Services Inc', 'Direct Deposit Account', 'Employer Payroll', 'ADP Payroll', 'Paychex Direct'],
  }
};

const PROFILES = {
  standard: { 
    income: { min: 3000, max: 6000 }, 
    mortgage: { min: 1200, max: 2000 }, 
    grocery: 150, 
    dining: 45, 
    fuel: 50, 
    subscriptions: 75, 
    utilities: 200, 
    luxuryThreshold: 500, 
    investFreq: 'yearly', 
    investAmount: { min: 1000, max: 5000 }, 
    loanAmount: { min: 200, max: 500 }, 
    businessPayments: false 
  },
  professional: { 
    income: { min: 7000, max: 12000 }, 
    mortgage: { min: 2000, max: 3500 }, 
    grocery: 200, 
    dining: 65, 
    fuel: 60, 
    subscriptions: 150, 
    utilities: 300, 
    luxuryThreshold: 1500, 
    investFreq: 'quarterly', 
    investAmount: { min: 3000, max: 10000 }, 
    loanAmount: { min: 500, max: 1000 }, 
    businessPayments: false 
  },
  businessOwner: { 
    income: { min: 15000, max: 30000 }, 
    mortgage: { min: 3500, max: 6000 }, 
    grocery: 350, 
    dining: 100, 
    fuel: 100, 
    subscriptions: 300, 
    utilities: 500, 
    luxuryThreshold: 3000, 
    investFreq: 'quarterly', 
    investAmount: { min: 10000, max: 30000 }, 
    loanAmount: { min: 1000, max: 5000 }, 
    businessPayments: true 
  },
  wealthy: { 
    income: { min: 30000, max: 60000 }, 
    mortgage: { min: 5000, max: 10000 }, 
    grocery: 500, 
    dining: 150, 
    fuel: 120, 
    subscriptions: 500, 
    utilities: 800, 
    luxuryThreshold: 5000, 
    investFreq: 'monthly', 
    investAmount: { min: 15000, max: 50000 }, 
    loanAmount: { min: 2000, max: 10000 }, 
    businessPayments: false 
  },
  highNetWorth: { 
    income: { min: 60000, max: 150000 }, 
    mortgage: { min: 8000, max: 20000 }, 
    grocery: 800, 
    dining: 250, 
    fuel: 150, 
    subscriptions: 1000, 
    utilities: 1500, 
    luxuryThreshold: 10000, 
    investFreq: 'monthly', 
    investAmount: { min: 30000, max: 100000 }, 
    loanAmount: { min: 5000, max: 20000 }, 
    businessPayments: false 
  },
  ultraHighNetWorth: { 
    income: { min: 150000, max: 500000 }, 
    mortgage: { min: 15000, max: 50000 }, 
    grocery: 1500, 
    dining: 400, 
    fuel: 200, 
    subscriptions: 2000, 
    utilities: 3000, 
    luxuryThreshold: 25000, 
    investFreq: 'monthly', 
    investAmount: { min: 100000, max: 500000 }, 
    loanAmount: { min: 10000, max: 50000 }, 
    businessPayments: false 
  }
};

const ACTIVITY = {
  low: { m: 0.5, c: 0.5, w: 0.3, b: 0.7, i: 0.3, l: 0.3, r: 0.5, bp: 0.3 },
  normal: { m: 1.0, c: 1.0, w: 1.0, b: 1.0, i: 1.0, l: 1.0, r: 1.0, bp: 1.0 },
  high: { m: 1.5, c: 1.5, w: 2.0, b: 1.3, i: 1.5, l: 1.5, r: 1.3, bp: 1.5 },
  veryHigh: { m: 2.0, c: 2.0, w: 3.0, b: 1.5, i: 2.0, l: 2.0, r: 1.5, bp: 2.0 },
};

const EXPENSE_CATEGORIES = ['groceries', 'restaurants', 'fuel', 'onlineRetail', 'entertainment', 'misc'];

module.exports = { MERCHANTS, BENEFICIARIES, PROFILES, ACTIVITY, EXPENSE_CATEGORIES };