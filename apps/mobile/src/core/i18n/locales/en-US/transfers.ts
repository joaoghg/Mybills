export const transfers = {
  hint: 'Move money between your accounts. Two transactions are created automatically.',
  amountLabel: 'Amount',
  amountPlaceholder: '0.00',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Optional note',
  sourceAccountLabel: 'From account',
  destinationAccountLabel: 'To account',
  noAccountsHint: 'Create at least two accounts before transferring.',
  submit: 'Transfer',
  submitLoading: 'Transferring…',
  editTitle: 'Edit transfer',
  updateSubmit: 'Save changes',
  updateLoading: 'Saving…',
  deleteAction: 'Delete transfer',
  deleteLoading: 'Deleting…',
  deleteConfirmTitle: 'Delete transfer?',
  deleteConfirmMessage:
    'Both linked transactions will be removed and account balances will be adjusted.',
  deleteConfirm: 'Delete',
  deleteCancel: 'Cancel',
  notFound: 'Transfer not found.',
  validation: {
    amountRequired: 'Enter an amount greater than zero.',
    dateRequired: 'Select a valid date.',
    sourceAccountRequired: 'Select the account to transfer from.',
    destinationAccountRequired: 'Select the account to transfer to.',
    accountsMustDiffer: 'Source and destination accounts must be different.'
  },
  errors: {
    network: 'Could not connect to the server. Check your connection and try again.',
    validation: 'Check the fields and try again.',
    generic: 'Something went wrong. Try again.',
    insufficientBalance: 'Insufficient balance in the source account.',
    transferFailed: 'The transfer could not be completed.'
  }
} as const;
