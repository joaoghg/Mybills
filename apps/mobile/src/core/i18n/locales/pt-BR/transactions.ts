export const transactions = {
  typeLabel: 'Tipo',
  types: {
    income: 'Receita',
    expense: 'Despesa',
    transfer: 'Transferência'
  },
  amountLabel: 'Valor',
  amountPlaceholder: '0,00',
  descriptionLabel: 'Descrição',
  descriptionPlaceholder: 'Estabelecimento ou título',
  dateLabel: 'Data',
  categoryLabel: 'Categoria',
  categoryNone: 'Nenhuma',
  accountLabel: 'Conta',
  accountNone: 'Nenhuma',
  cardLabel: 'Cartão de crédito',
  cardNone: 'Nenhum',
  noAccountsHint: 'Crie uma conta primeiro para vincular esta transação.',
  noCardsHint: 'Nenhum cartão de crédito ainda.',
  paidLabel: 'Pago',
  paidHint: 'Só afeta o saldo da conta quando uma conta estiver selecionada.',
  transferHint: 'Transferências debitam uma conta. Conta de destino ainda não é suportada.',
  cardVsAccountHint: 'Escolha conta ou cartão, não os dois.',
  submit: 'Salvar transação',
  submitLoading: 'Salvando…',
  validation: {
    amountRequired: 'Informe um valor maior que zero.',
    paidRequiresAccount: 'Selecione uma conta ao marcar como pago.',
    typeRequired: 'Selecione um tipo de transação.',
    dateRequired: 'Selecione uma data válida.',
    accountInvalid: 'Selecione uma conta válida.',
    categoryInvalid: 'Selecione uma categoria válida.',
    cardInvalid: 'Selecione um cartão de crédito válido.'
  },
  errors: {
    network: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    validation: 'Verifique os campos e tente novamente.',
    generic: 'Algo deu errado. Tente novamente.',
    accountNotFound: 'A conta selecionada não foi encontrada.',
    categoryNotFound: 'A categoria selecionada não foi encontrada.',
    cardNotFound: 'O cartão selecionado não foi encontrado.',
    invalidIsPaid: 'Status de pago inválido para esta transação.'
  }
} as const;
