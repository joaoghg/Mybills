export const creditCards = {
  nameLabel: 'Nome do cartão',
  namePlaceholder: 'ex.: Nubank, Itaú',
  limitLabel: 'Limite',
  limitPlaceholder: '0,00',
  closingDayLabel: 'Dia de fechamento',
  closingDayPlaceholder: '1–31',
  closingOnLastDayLabel: 'Fechar no último dia do mês',
  closingOnLastDayHint: 'Usa 28, 29, 30 ou 31 conforme o mês.',
  dueDayLabel: 'Dia de vencimento',
  dueDayPlaceholder: '1–31',
  accountLabel: 'Conta vinculada',
  noAccountOption: 'Nenhuma conta',
  accountHint: 'Opcional. Vincule a uma conta para pagamento da fatura.',
  noAccountsHint: 'Você ainda não tem contas. O cartão pode ser cadastrado sem vínculo.',
  submit: 'Cadastrar cartão',
  submitLoading: 'Cadastrando…',
  editTitle: 'Editar cartão',
  updateSubmit: 'Salvar alterações',
  updateLoading: 'Salvando…',
  notFound: 'Cartão não encontrado.',
  deleteAction: 'Excluir cartão',
  deleteConfirmTitle: 'Excluir cartão?',
  deleteConfirmMessage: '“{{name}}” será removido permanentemente.',
  deleteCancel: 'Cancelar',
  deleteConfirm: 'Excluir',
  deleteLoading: 'Excluindo…',
  errors: {
    network: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    validation: 'Verifique os campos e tente novamente.',
    generic: 'Algo deu errado. Tente novamente.'
  },
  validation: {
    nameRequired: 'Informe o nome do cartão.',
    limitInvalid: 'Informe um limite válido (ex.: 5.000,00).',
    closingDayInvalid: 'Informe o dia de fechamento (1–31).',
    dueDayInvalid: 'Informe o dia de vencimento (1–31).'
  }
} as const;
