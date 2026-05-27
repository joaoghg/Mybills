export const categories = {
  nameLabel: 'Category name',
  namePlaceholder: 'e.g. Food, Transport',
  iconSectionTitle: 'Icon',
  iconAccessibility: 'Select {{icon}} icon',
  submit: 'Create category',
  submitLoading: 'Creating…',
  errors: {
    network: 'Could not reach the server. Check your connection and try again.',
    validation: 'Please check the fields and try again.',
    generic: 'Something went wrong. Please try again.',
    alreadyExists: 'You already have a category with this name.'
  },
  validation: {
    nameRequired: 'Enter a category name.',
    iconRequired: 'Select an icon for the category.'
  }
} as const;
