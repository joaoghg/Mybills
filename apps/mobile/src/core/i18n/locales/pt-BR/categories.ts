export const categories = {
  nameLabel: 'Nome da categoria',
  namePlaceholder: 'ex.: Alimentação, Transporte',
  iconSectionTitle: 'Ícone',
  iconAccessibility: 'Selecionar ícone {{icon}}',
  submit: 'Criar categoria',
  submitLoading: 'Criando…',
  errors: {
    network: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    validation: 'Verifique os campos e tente novamente.',
    generic: 'Algo deu errado. Tente novamente.',
    alreadyExists: 'Você já tem uma categoria com este nome.'
  },
  validation: {
    nameRequired: 'Informe o nome da categoria.',
    iconRequired: 'Selecione um ícone para a categoria.'
  }
} as const;
