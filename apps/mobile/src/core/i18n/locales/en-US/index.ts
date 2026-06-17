import { accounts } from './accounts';
import { auth } from './auth';
import { categories } from './categories';
import { creditCards } from './creditCards';
import { history } from './history';
import { home } from './home';
import { more } from './more';
import { onboarding } from './onboarding';
import { quickAdd } from './quickAdd';
import { tabs } from './tabs';
import { transactions } from './transactions';
import { transfers } from './transfers';
import { wallet } from './wallet';

export const enUS = {
  accounts,
  auth,
  categories,
  creditCards,
  history,
  home,
  more,
  onboarding,
  quickAdd,
  tabs,
  transactions,
  transfers,
  wallet
} as const;
