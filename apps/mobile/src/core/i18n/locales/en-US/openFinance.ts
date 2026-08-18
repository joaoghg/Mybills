export const openFinance = {
  settingsTitle: 'Open Finance',
  settingsSubtitle: 'Register a Connector 200 Item ID from Meu Pluggy.',
  itemIdLabel: 'Item ID',
  itemIdPlaceholder: 'Item UUID',
  register: 'Register connection',
  syncNow: 'Sync now',
  syncing: 'Syncing…',
  disconnect: 'Disconnect',
  disconnectTitle: 'Disconnect institution?',
  disconnectMessage: '“{{name}}” will be disconnected. Imported data will disappear from the app.',
  disconnectCancel: 'Cancel',
  disconnectConfirm: 'Disconnect',
  unknownInstitution: 'Institution',
  investmentsTitle: 'Investments',
  investmentsEmpty: 'No imported investments.',
  investmentDetailTitle: 'Investment',
  annualRate: 'Annual rate',
  quantity: 'Quantity',
  movements: 'Movements',
  badgeImported: 'Imported',
  badgeImportedEdited: 'Imported · edited',
  badgeForecast: 'Forecast',
  moreRow: 'Open Finance',
  investmentsRow: 'Investments',
  status: {
    ACTIVE: 'Active',
    DISCONNECTED: 'Disconnected'
  },
  productStatus: {
    PENDING: 'Pending',
    SUCCESS: 'Synced',
    PARTIAL: 'Partial',
    FAILED: 'Failed',
    UNSUPPORTED: 'Unsupported'
  },
  products: {
    ACCOUNTS: 'Accounts',
    CREDIT_CARDS: 'Cards',
    TRANSACTIONS: 'Transactions',
    INVESTMENTS: 'Investments',
    INVESTMENTS_TRANSACTIONS: 'Movements'
  },
  investmentTypes: {
    FIXED_INCOME: 'Fixed income',
    SECURITY: 'Security',
    MUTUAL_FUND: 'Fund',
    EQUITY: 'Equity',
    ETF: 'ETF',
    COE: 'COE',
    OTHER: 'Other'
  },
  investmentTxTypes: {
    BUY: 'Buy',
    SELL: 'Sell',
    TAX: 'Tax',
    TRANSFER: 'Transfer',
    INTEREST: 'Interest',
    AMORTIZATION: 'Amortization'
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    item_unavailable: 'This Item could not be retrieved. Check the ID and try again.',
    invalid_connector: 'Only Meu Pluggy (Connector 200) connections are accepted.',
    item_already_registered: 'This connection is already registered.'
  }
} as const;
