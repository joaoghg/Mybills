export type RootStackParamList = {
  MainTabs: undefined;
  AddAccount: undefined;
  AddTransaction: undefined;
  AddTransfer: undefined;
  EditTransaction: { transactionId: string };
  EditTransfer: { transferGroupId: string };
  AddCreditCard: undefined;
  EditAccount: { accountId: string };
  EditCreditCard: { cardId: string };
  AddCategory: undefined;
  CategoryManagement: undefined;
  EditCategory: { categoryId: string };
  LanguageSettings: undefined;
  ThemeSettings: undefined;
};

export type AppTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  AddTab: undefined;
  WalletTab: undefined;
  MoreTab: undefined;
};
