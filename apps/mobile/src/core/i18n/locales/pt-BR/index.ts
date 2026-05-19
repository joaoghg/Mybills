import { accounts } from './accounts';
import { auth } from './auth';
import { history } from './history';
import { home } from './home';
import { more } from './more';
import { onboarding } from './onboarding';
import { quickAdd } from './quickAdd';
import { tabs } from './tabs';
import { wallet } from './wallet';

export const ptBR = { accounts, auth, history, home, more, onboarding, quickAdd, tabs, wallet } as const;
