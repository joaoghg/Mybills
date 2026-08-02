export const transfers = {
  hint: 'Mova dinheiro entre suas contas. Duas transações são criadas automaticamente.',
  amountLabel: 'Valor',
  amountPlaceholder: '0,00',
  descriptionLabel: 'Descrição',
  descriptionPlaceholder: 'Observação opcional',
  sourceAccountLabel: 'Conta de saída',
  destinationAccountLabel: 'Conta de entrada',
  noAccountsHint: 'Crie pelo menos duas contas antes de transferir.',
  submit: 'Transferir',
  submitLoading: 'Transferindo…',
  editTitle: 'Editar transferência',
  updateSubmit: 'Salvar alterações',
  updateLoading: 'Salvando…',
  deleteAction: 'Excluir transferência',
  deleteLoading: 'Excluindo…',
  deleteConfirmTitle: 'Excluir transferência?',
  deleteConfirmMessage:
    'As duas transações vinculadas serão removidas e os saldos das contas serão ajustados.',
  deleteConfirm: 'Excluir',
  deleteCancel: 'Cancelar',
  notFound: 'Transferência não encontrada.',
  validation: {
    amountRequired: 'Informe um valor maior que zero.',
    dateRequired: 'Selecione uma data válida.',
    sourceAccountRequired: 'Selecione a conta de saída.',
    destinationAccountRequired: 'Selecione a conta de entrada.',
    accountsMustDiffer: 'As contas de saída e entrada devem ser diferentes.'
  },
  errors: {
    network: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    validation: 'Verifique os campos e tente novamente.',
    generic: 'Algo deu errado. Tente novamente.',
    insufficientBalance: 'Saldo insuficiente na conta de saída.',
    transferFailed: 'A transferência não pôde ser concluída.'
  }
} as const;
