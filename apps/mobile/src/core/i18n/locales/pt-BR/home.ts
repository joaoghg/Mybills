export const home = {
  title: 'Início',
  brandName: 'MyBills',
  notificationsHint: 'Notificações',
  profileHint: 'Perfil',
  accountsSection: 'Minhas Contas',
  newAccount: 'Nova Conta',
  physicalCards: 'Cartões Físicos',
  premiumTag: 'PREMIUM',
  contactlessHint: 'Pagamento por aproximação',
  availableLimit: 'LIMITE DISPONÍVEL',
  cardMasked: '•••• {{lastFour}}',
  currentInvoiceLabel: 'FATURA ATUAL',
  payInvoice: 'Pagar Fatura',
  dueInDays: 'Vence em {{days}} dias',
  recentSection: 'Recentes',
  seeAll: 'VER TUDO',
  percentThisMonth: '+{{value}}% este mês',
  mockAccounts: {
    main: { title: 'Banco Principal', subtitle: 'Conta Corrente' },
    investments: { title: 'Investimentos', subtitle: 'Poupança' }
  },
  mockTransactions: {
    supermarket: 'Supermercado',
    lunch: 'Almoço'
  },
  mockTransactionsTimes: {
    supermarket: 'Hoje, 14:20',
    lunch: 'Hoje, 12:05'
  }
} as const;
