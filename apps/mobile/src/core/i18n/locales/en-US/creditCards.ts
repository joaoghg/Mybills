export const creditCards = {
  nameLabel: 'Card name',
  namePlaceholder: 'e.g. Chase, Amex',
  limitLabel: 'Credit limit',
  limitPlaceholder: '0.00',
  closingDayLabel: 'Closing day',
  closingDayPlaceholder: '1–31',
  closingOnLastDayLabel: 'Close on last day of month',
  closingOnLastDayHint: 'Uses 28, 29, 30, or 31 depending on the month.',
  dueDayLabel: 'Due day',
  dueDayPlaceholder: '1–31',
  accountLabel: 'Linked account',
  noAccountOption: 'No account',
  accountHint: 'Optional. Link an account to pay the statement.',
  noAccountsHint: 'You have no accounts yet. The card can be registered without a link.',
  submit: 'Add card',
  submitLoading: 'Adding…',
  editTitle: 'Edit card',
  updateSubmit: 'Save changes',
  updateLoading: 'Saving…',
  notFound: 'Card not found.',
  deleteAction: 'Delete card',
  deleteConfirmTitle: 'Delete card?',
  deleteConfirmMessage: '“{{name}}” will be removed permanently.',
  deleteCancel: 'Cancel',
  deleteConfirm: 'Delete',
  deleteLoading: 'Deleting…',
  errors: {
    network: 'Could not connect to the server. Check your connection and try again.',
    validation: 'Check the fields and try again.',
    generic: 'Something went wrong. Try again.'
  },
  validation: {
    nameRequired: 'Enter the card name.',
    limitInvalid: 'Enter a valid limit (e.g. 5,000.00).',
    closingDayInvalid: 'Enter the closing day (1–31).',
    dueDayInvalid: 'Enter the due day (1–31).'
  }
} as const;
