import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useQuickAddMenu } from '@/navigation/quick-add-menu-context';
import type { RootStackParamList } from '@/navigation/types';

type QuickAddStackRoute = 'AddAccount' | 'AddTransaction' | 'AddCreditCard';

export function CustomTabBar(props: BottomTabBarProps) {
  const { isOpen, close } = useQuickAddMenu();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  function handleSelect(route: QuickAddStackRoute) {
    close();
    navigation.navigate(route);
  }

  return (
    <View style={styles.wrapper}>
      {isOpen ? (
        <View
          style={[
            styles.rail,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border
            }
          ]}
          accessibilityRole="menu"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              accessibilityRole="menuitem"
              accessibilityLabel={t('quickAdd.account')}
              onPress={() => handleSelect('AddAccount')}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border
                },
                pressed && styles.chipPressed
              ]}
            >
              <Ionicons name="wallet-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>
                {t('quickAdd.account')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="menuitem"
              accessibilityLabel={t('quickAdd.transaction')}
              onPress={() => handleSelect('AddTransaction')}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border
                },
                pressed && styles.chipPressed
              ]}
            >
              <Ionicons name="swap-vertical-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>
                {t('quickAdd.transaction')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="menuitem"
              accessibilityLabel={t('quickAdd.creditCard')}
              onPress={() => handleSelect('AddCreditCard')}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border
                },
                pressed && styles.chipPressed
              ]}
            >
              <Ionicons name="card-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>
                {t('quickAdd.creditCard')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
      <BottomTabBar {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  rail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10
  },
  railContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1
  },
  chipPressed: {
    opacity: 0.88
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '700'
  }
});
