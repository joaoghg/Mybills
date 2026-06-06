export const categories = {
  nameLabel: 'Category name',
  namePlaceholder: 'e.g. Food, Transport',
  iconSectionTitle: 'Icon',
  iconAccessibility: 'Select {{icon}} icon',
  submit: 'Create category',
  submitLoading: 'Creating…',
  updateSubmit: 'Save changes',
  updateLoading: 'Saving…',
  editTitle: 'Edit category',
  manageTitle: 'Categories',
  manageEyebrow: 'Catalog',
  manageHeadline: 'Your categories',
  manageSubtitle: 'Organize how you track every expense and income.',
  manageCountLabel: 'total',
  addNew: 'New category',
  editAction: 'Edit category',
  deleteAction: 'Delete category',
  deleteConfirmTitle: 'Delete category?',
  deleteConfirmMessage: '“{{name}}” will be removed permanently.',
  deleteCancel: 'Cancel',
  deleteConfirm: 'Delete',
  emptyTitle: 'No categories yet',
  emptySubtitle: 'Create your first category to classify transactions.',
  notFound: 'Category not found.',
  retry: 'Try again',
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
