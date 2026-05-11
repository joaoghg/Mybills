export const home = {
  title: 'Home',
  brandName: 'MyBills',
  notificationsHint: 'Notifications',
  profileHint: 'Profile',
  accountsSection: 'My accounts',
  newAccount: 'New account',
  physicalCards: 'Physical cards',
  premiumTag: 'PREMIUM',
  contactlessHint: 'Contactless payment',
  availableLimit: 'AVAILABLE LIMIT',
  cardMasked: '•••• {{lastFour}}',
  currentInvoiceLabel: 'CURRENT INVOICE',
  payInvoice: 'Pay invoice',
  dueInDays: 'Due in {{days}} days',
  recentSection: 'Recent',
  seeAll: 'SEE ALL',
  percentThisMonth: '+{{value}}% this month',
  mockAccounts: {
    main: { title: 'Main bank', subtitle: 'Checking account' },
    investments: { title: 'Investments', subtitle: 'Savings' }
  },
  mockTransactions: {
    supermarket: 'Grocery',
    lunch: 'Lunch'
  },
  mockTransactionsTimes: {
    supermarket: 'Today, 2:20 PM',
    lunch: 'Today, 12:05 PM'
  }
} as const;
