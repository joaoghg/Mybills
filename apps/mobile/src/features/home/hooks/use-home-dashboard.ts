export type AccountSummary = {
  id: 'main' | 'investments';
  balance: number;
  percentChange: number;
};

export type PhysicalCard = {
  id: string;
  lastFour: string;
  limit: number;
  variant: 'navy' | 'green';
  tag?: 'premium';
};

export type InvoiceSummary = {
  total: number;
  dueInDays: number;
};

export type RecentTransaction = {
  id: string;
  categoryId: 'supermarket' | 'lunch';
  amount: number;
  timeRowKey: 'supermarket' | 'lunch';
};

export function useHomeDashboard(): {
  accounts: AccountSummary[];
  physicalCards: PhysicalCard[];
  invoice: InvoiceSummary;
  recent: RecentTransaction[];
} {
  return {
    accounts: [
      { id: 'main', balance: 12450, percentChange: 2.4 },
      { id: 'investments', balance: 8320.5, percentChange: 1.1 }
    ],
    physicalCards: [
      { id: '1', lastFour: '8821', limit: 15000, variant: 'navy', tag: 'premium' },
      { id: '2', lastFour: '4412', limit: 8000, variant: 'green' }
    ],
    invoice: {
      total: 2450.22,
      dueInDays: 3
    },
    recent: [
      {
        id: 't1',
        categoryId: 'supermarket',
        amount: -145,
        timeRowKey: 'supermarket'
      },
      {
        id: 't2',
        categoryId: 'lunch',
        amount: -32.5,
        timeRowKey: 'lunch'
      }
    ]
  };
}
