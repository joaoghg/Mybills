import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  isOpenFinanceRegisterDisabled,
  isOpenFinanceSyncDisabled,
  isOpenFinanceSyncInProgress,
  resolveOpenFinanceErrorI18nKey
} from '@mybills/utils';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { useTheme } from '@/core/theme';
import { useOpenFinanceConnections } from '@/features/open-finance/hooks/use-open-finance-connections';
import {
  useDisconnectOpenFinanceConnection,
  useRegisterOpenFinanceConnection,
  useStartOpenFinanceSync
} from '@/features/open-finance/hooks/use-open-finance-mutations';
import { useOpenFinanceSyncRun } from '@/features/open-finance/hooks/use-open-finance-sync-run';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';

type Props = NativeStackScreenProps<RootStackParamList, 'OpenFinanceSettings'>;

export function OpenFinanceSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: connections = [], isLoading, refetch, isRefetching } = useOpenFinanceConnections();
  const register = useRegisterOpenFinanceConnection();
  const disconnect = useDisconnectOpenFinanceConnection();
  const startSync = useStartOpenFinanceSync();
  const [itemId, setItemId] = useState('');
  const [activeRun, setActiveRun] = useState<{ connectionId: string; syncRunId: string } | null>(
    null
  );
  const syncRun = useOpenFinanceSyncRun(activeRun?.connectionId ?? null, activeRun?.syncRunId ?? null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('openFinance.settingsTitle') });
  }, [navigation, t]);

  useEffect(() => {
    if (!syncRun.data) {
      return;
    }

    if (syncRun.data.status === 'SUCCESS' || syncRun.data.status === 'PARTIAL') {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['open-finance'] });
      setActiveRun(null);
    }

    if (syncRun.data.status === 'FAILED') {
      setActiveRun(null);
    }
  }, [queryClient, syncRun.data]);

  function handleRegister() {
    register.mutate(itemId.trim(), {
      onSuccess: () => setItemId('')
    });
  }

  function handleDisconnect(connectionId: string, name: string) {
    Alert.alert(t('openFinance.disconnectTitle'), t('openFinance.disconnectMessage', { name }), [
      { text: t('openFinance.disconnectCancel'), style: 'cancel' },
      {
        text: t('openFinance.disconnectConfirm'),
        style: 'destructive',
        onPress: () => disconnect.mutate(connectionId)
      }
    ]);
  }

  const busy = register.isPending || disconnect.isPending || startSync.isPending;
  const syncing = isOpenFinanceSyncInProgress(syncRun.data?.status);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
      }
    >
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {t('openFinance.settingsSubtitle')}
      </Text>
      <InputField
        theme={theme}
        label={t('openFinance.itemIdLabel')}
        value={itemId}
        onChangeText={setItemId}
        placeholder={t('openFinance.itemIdPlaceholder')}
        autoCapitalize="none"
      />
      <Pressable
        accessibilityRole="button"
        disabled={isOpenFinanceRegisterDisabled(itemId, busy)}
        onPress={handleRegister}
        style={[
          styles.button,
          { backgroundColor: theme.colors.primary },
          (isOpenFinanceRegisterDisabled(itemId, busy)) && styles.disabled
        ]}
      >
        {register.isPending ? (
          <ActivityIndicator color={theme.colors.textOnPrimary} />
        ) : (
          <Text style={[styles.buttonLabel, { color: theme.colors.textOnPrimary }]}>
            {t('openFinance.register')}
          </Text>
        )}
      </Pressable>
      {register.isError ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>
          {t(resolveOpenFinanceErrorI18nKey(undefined))}
        </Text>
      ) : null}

      {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}

      {connections.map((connection) => {
        const inProgress = connection.products.some(
          (product) => product.status === 'PENDING' || product.status === 'PARTIAL'
        );
        return (
          <View
            key={connection.id}
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              {connection.institutionName ?? t('openFinance.unknownInstitution')}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
              {t(`openFinance.status.${connection.status}`)}
              {connection.lastSuccessfulSyncAt
                ? ` · ${new Date(connection.lastSuccessfulSyncAt).toLocaleString()}`
                : ''}
            </Text>
            {connection.products.map((product) => (
              <Text key={product.product} style={[styles.meta, { color: theme.colors.textSecondary }]}>
                {t(`openFinance.products.${product.product}`)}: {t(`openFinance.productStatus.${product.status}`)}
              </Text>
            ))}
            <Pressable
              accessibilityRole="button"
              disabled={isOpenFinanceSyncDisabled({
                busy,
                syncing,
                connectionStatus: connection.status
              })}
              onPress={() =>
                startSync.mutate(connection.id, {
                  onSuccess: (run) => setActiveRun({ connectionId: connection.id, syncRunId: run.id })
                })
              }
              style={[
                styles.secondary,
                { borderColor: theme.colors.primary },
                isOpenFinanceSyncDisabled({
                  busy,
                  syncing,
                  connectionStatus: connection.status
                }) && styles.disabled
              ]}
            >
              <Text style={[styles.secondaryLabel, { color: theme.colors.primary }]}>
                {syncing || inProgress ? t('openFinance.syncing') : t('openFinance.syncNow')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() =>
                handleDisconnect(
                  connection.id,
                  connection.institutionName ?? t('openFinance.unknownInstitution')
                )
              }
            >
              <Text style={[styles.danger, { color: theme.colors.danger }]}>
                {t('openFinance.disconnect')}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20
  },
  buttonLabel: { fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
  error: { marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16, gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13 },
  secondary: {
    marginTop: 12,
    minHeight: 44,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryLabel: { fontWeight: '700' },
  danger: { marginTop: 10, fontWeight: '600' }
});
