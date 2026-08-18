export const openFinance = {
  settingsTitle: 'Open Finance',
  settingsSubtitle: 'Registre um Item ID do Connector 200 do Meu Pluggy.',
  itemIdLabel: 'Item ID',
  itemIdPlaceholder: 'UUID do Item',
  register: 'Registrar conexão',
  syncNow: 'Sincronizar agora',
  syncing: 'Sincronizando…',
  disconnect: 'Desconectar',
  disconnectTitle: 'Desconectar instituição?',
  disconnectMessage:
    '“{{name}}” será desconectada. Os dados importados deixam de aparecer no app.',
  disconnectCancel: 'Cancelar',
  disconnectConfirm: 'Desconectar',
  unknownInstitution: 'Instituição',
  investmentsTitle: 'Investimentos',
  investmentsEmpty: 'Nenhum investimento importado.',
  investmentDetailTitle: 'Investimento',
  annualRate: 'Taxa anual',
  quantity: 'Quantidade',
  movements: 'Movimentações',
  badgeImported: 'Importado',
  badgeImportedEdited: 'Importado · editado',
  badgeForecast: 'Previsão',
  moreRow: 'Open Finance',
  investmentsRow: 'Investimentos',
  status: {
    ACTIVE: 'Ativa',
    DISCONNECTED: 'Desconectada'
  },
  productStatus: {
    PENDING: 'Pendente',
    SUCCESS: 'Sincronizado',
    PARTIAL: 'Parcial',
    FAILED: 'Falhou',
    UNSUPPORTED: 'Não suportado'
  },
  products: {
    ACCOUNTS: 'Contas',
    CREDIT_CARDS: 'Cartões',
    TRANSACTIONS: 'Transações',
    INVESTMENTS: 'Investimentos',
    INVESTMENTS_TRANSACTIONS: 'Movimentações'
  },
  investmentTypes: {
    FIXED_INCOME: 'Renda fixa',
    SECURITY: 'Título',
    MUTUAL_FUND: 'Fundo',
    EQUITY: 'Renda variável',
    ETF: 'ETF',
    COE: 'COE',
    OTHER: 'Outro'
  },
  investmentTxTypes: {
    BUY: 'Aplicação',
    SELL: 'Resgate',
    TAX: 'Imposto',
    TRANSFER: 'Transferência',
    INTEREST: 'Juros',
    AMORTIZATION: 'Amortização'
  },
  errors: {
    generic: 'Não foi possível concluir. Tente novamente.',
    item_unavailable: 'Este Item não pôde ser obtido. Confira o ID e tente novamente.',
    invalid_connector: 'Somente conexões do Meu Pluggy (Connector 200) são aceitas.',
    item_already_registered: 'Esta conexão já está registrada.'
  }
} as const;
