export const transactions = {
  typeLabel: 'Type',
  types: {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer'
  },
  amountLabel: 'Amount',
  amountPlaceholder: '0.00',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Store or title',
  dateLabel: 'Date',
  categoryLabel: 'Category',
  categoryNone: 'None',
  accountLabel: 'Account',
  accountNone: 'None',
  cardLabel: 'Credit card',
  cardNone: 'None',
  noAccountsHint: 'Create an account first to link this transaction.',
  noCardsHint: 'No credit cards yet.',
  paidLabel: 'Paid',
  paidHint: 'Only affects account balance when an account is selected.',
  transferHint: 'Transfers debit one account. A destination account is not supported yet.',
  cardVsAccountHint: 'Choose either an account or a card, not both.',
  submit: 'Save transaction',
  submitLoading: 'Saving…',
  validation: {
    amountRequired: 'Enter an amount greater than zero.',
    paidRequiresAccount: 'Select an account when marking as paid.',
    typeRequired: 'Select a transaction type.',
    dateRequired: 'Select a valid date.',
    accountInvalid: 'Select a valid account.',
    categoryInvalid: 'Select a valid category.',
    cardInvalid: 'Select a valid credit card.'
  },
  errors: {
    network: 'Could not reach the server. Check your connection and try again.',
    validation: 'Please check the fields and try again.',
    generic: 'Something went wrong. Please try again.',
    accountNotFound: 'The selected account was not found.',
    categoryNotFound: 'The selected category was not found.',
    cardNotFound: 'The selected credit card was not found.',
    invalidIsPaid: 'Paid status is invalid for this transaction.'
  }
} as const;
