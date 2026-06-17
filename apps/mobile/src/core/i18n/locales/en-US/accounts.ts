export const accounts = {
  nameLabel: 'Account name',
  namePlaceholder: 'e.g. Checking, Savings',
  balanceLabel: 'Initial balance',
  balanceEditLabel: 'Balance',
  balancePlaceholder: '0,00',
  balanceHint:
    'Optional. Enter only numbers.',
  submit: 'Create account',
  submitLoading: 'Creating…',
  editTitle: 'Edit account',
  updateSubmit: 'Save changes',
  updateLoading: 'Saving…',
  notFound: 'Account not found.',
  deleteAction: 'Delete account',
  deleteConfirmTitle: 'Delete account?',
  deleteConfirmMessage:
    '“{{name}}” will be removed permanently. Linked credit cards will also be deleted.',
  deleteCancel: 'Cancel',
  deleteConfirm: 'Delete',
  deleteLoading: 'Deleting…',
  errors: {
    network: 'Could not reach the server. Check your connection and try again.',
    validation: 'Please check the fields and try again.',
    generic: 'Something went wrong. Please try again.'
  },
  validation: {
    nameRequired: 'Enter an account name.',
    balanceInvalid: 'Enter a valid amount (e.g. 100,00).'
  }
} as const;
