export const accounts = {
  nameLabel: 'Nome da conta',
  namePlaceholder: 'ex.: Corrente, Poupança',
  balanceLabel: 'Saldo inicial',
  balancePlaceholder: '0,00',
  balanceHint:
    'Opcional. Digite só números.',
  submit: 'Criar conta',
  submitLoading: 'Criando…',
  errors: {
    network: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    validation: 'Verifique os campos e tente novamente.',
    generic: 'Algo deu errado. Tente novamente.'
  },
  validation: {
    nameRequired: 'Informe o nome da conta.',
    balanceInvalid: 'Informe um valor válido (ex.: 100,00).'
  }
} as const;
