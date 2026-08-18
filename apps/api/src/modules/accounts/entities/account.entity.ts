export class Account {
  id: string;
  name: string;
  balance: number;
  userId: string;
  source: 'MANUAL' | 'PLUGGY';
  currencyCode: string | null;
  overriddenFields: string[];
  hiddenAt: string | null;
  createdAt: string;
  updatedAt: string;
}
