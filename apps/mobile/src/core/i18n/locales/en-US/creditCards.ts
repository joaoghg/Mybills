export const creditCards = {
  nameLabel: 'Card name',
  namePlaceholder: 'e.g. Chase, Amex',
  limitLabel: 'Credit limit',
  limitPlaceholder: '0.00',
  closingDayLabel: 'Closing day',
  closingDayPlaceholder: '1–31',
  dueDayLabel: 'Due day',
  dueDayPlaceholder: '1–31',
  accountLabel: 'Linked account',
  noAccountOption: 'No account',
  accountHint: 'Optional. Link an account to pay the statement.',
  noAccountsHint: 'You have no accounts yet. The card can be registered without a link.',
  submit: 'Add card',
  submitLoading: 'Adding…',
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
