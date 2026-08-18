export type OpenFinanceSource = 'MANUAL' | 'PLUGGY';

export type ImportedBadgeKind = 'none' | 'imported' | 'importedEdited' | 'forecast';

export type OpenFinanceConnectionStatus = 'ACTIVE' | 'DISCONNECTED';

export type OpenFinanceSyncRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export function importedBadgeKind(input: {
  source?: OpenFinanceSource | null;
  overriddenFields?: string[] | null;
  isForecast?: boolean | null;
}): ImportedBadgeKind {
  if (input.isForecast) {
    return 'forecast';
  }

  if (input.source !== 'PLUGGY') {
    return 'none';
  }

  return (input.overriddenFields?.length ?? 0) > 0 ? 'importedEdited' : 'imported';
}

export function importedBadgeI18nKey(kind: ImportedBadgeKind): string | null {
  if (kind === 'imported') {
    return 'openFinance.badgeImported';
  }

  if (kind === 'importedEdited') {
    return 'openFinance.badgeImportedEdited';
  }

  if (kind === 'forecast') {
    return 'openFinance.badgeForecast';
  }

  return null;
}

export function isOpenFinanceSyncDisabled(input: {
  busy: boolean;
  syncing: boolean;
  connectionStatus: OpenFinanceConnectionStatus | string;
}): boolean {
  return input.busy || input.syncing || input.connectionStatus !== 'ACTIVE';
}

export function isOpenFinanceRegisterDisabled(itemId: string, busy: boolean): boolean {
  return busy || itemId.trim().length === 0;
}

export function isOpenFinanceSyncInProgress(status?: OpenFinanceSyncRunStatus | null): boolean {
  return status === 'PENDING' || status === 'RUNNING';
}

export const openFinanceDisconnectCacheKeys = [
  ['open-finance', 'connections'],
  ['open-finance', 'investments'],
  ['accounts'],
  ['credit-cards'],
  ['transactions']
] as const;

export function resolveOpenFinanceErrorI18nKey(code?: string | null): string {
  if (!code) {
    return 'openFinance.errors.generic';
  }

  return `openFinance.errors.${code.replace(/^open_finance\./, '')}`;
}
