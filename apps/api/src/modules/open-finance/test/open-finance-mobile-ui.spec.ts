import {
  importedBadgeI18nKey,
  importedBadgeKind,
  isOpenFinanceRegisterDisabled,
  isOpenFinanceSyncDisabled,
  isOpenFinanceSyncInProgress,
  openFinanceDisconnectCacheKeys,
  resolveOpenFinanceErrorI18nKey
} from '@mybills/utils';

describe('Open Finance mobile UI state', () => {
  it('disables Sync now while a run is in progress or the connection is inactive', () => {
    expect(
      isOpenFinanceSyncDisabled({ busy: false, syncing: false, connectionStatus: 'ACTIVE' })
    ).toBe(false);
    expect(
      isOpenFinanceSyncDisabled({ busy: false, syncing: true, connectionStatus: 'ACTIVE' })
    ).toBe(true);
    expect(
      isOpenFinanceSyncDisabled({ busy: true, syncing: false, connectionStatus: 'ACTIVE' })
    ).toBe(true);
    expect(
      isOpenFinanceSyncDisabled({ busy: false, syncing: false, connectionStatus: 'DISCONNECTED' })
    ).toBe(true);
    expect(isOpenFinanceSyncInProgress('PENDING')).toBe(true);
    expect(isOpenFinanceSyncInProgress('SUCCESS')).toBe(false);
  });

  it('disables registration until an Item ID is present', () => {
    expect(isOpenFinanceRegisterDisabled('', false)).toBe(true);
    expect(isOpenFinanceRegisterDisabled('  ', false)).toBe(true);
    expect(isOpenFinanceRegisterDisabled('item-id', true)).toBe(true);
    expect(isOpenFinanceRegisterDisabled('item-id', false)).toBe(false);
  });

  it('maps imported, edited, and forecast badges to localized keys', () => {
    expect(importedBadgeKind({ source: 'MANUAL' })).toBe('none');
    expect(importedBadgeKind({ source: 'PLUGGY', overriddenFields: [] })).toBe('imported');
    expect(importedBadgeKind({ source: 'PLUGGY', overriddenFields: ['name'] })).toBe(
      'importedEdited'
    );
    expect(importedBadgeKind({ source: 'PLUGGY', isForecast: true })).toBe('forecast');
    expect(importedBadgeI18nKey('imported')).toBe('openFinance.badgeImported');
    expect(importedBadgeI18nKey('importedEdited')).toBe('openFinance.badgeImportedEdited');
    expect(importedBadgeI18nKey('forecast')).toBe('openFinance.badgeForecast');
  });

  it('invalidates connection, investment, and domain caches on disconnect', () => {
    expect(openFinanceDisconnectCacheKeys).toEqual(
      expect.arrayContaining([
        ['open-finance', 'connections'],
        ['open-finance', 'investments'],
        ['accounts'],
        ['credit-cards'],
        ['transactions']
      ])
    );
  });

  it('falls back to a generic localized error when the provider code is missing', () => {
    expect(resolveOpenFinanceErrorI18nKey()).toBe('openFinance.errors.generic');
    expect(resolveOpenFinanceErrorI18nKey('open_finance.item_unavailable')).toBe(
      'openFinance.errors.item_unavailable'
    );
  });
});
