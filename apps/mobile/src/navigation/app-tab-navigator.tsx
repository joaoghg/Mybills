import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { HistoryScreen } from '@/features/history/screens/history-screen';
import { HomeScreen } from '@/features/home/screens/home-screen';
import { MoreScreen } from '@/features/more/screens/more-screen';
import { WalletScreen } from '@/features/wallet/screens/wallet-screen';
import { AddTabButton } from '@/navigation/add-tab-button';
import type { AppTabParamList } from '@/navigation/types';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabNavigator() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : insets.bottom + 8;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingTop: 8,
          paddingBottom: tabBarBottomPadding,
          minHeight: 56 + tabBarBottomPadding
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600'
        },
        tabBarIcon: ({ color, focused, size }) => {
          if (route.name === 'AddTab') {
            return null;
          }

          const iconName =
            route.name === 'HomeTab'
              ? focused
                ? 'home'
                : 'home-outline'
              : route.name === 'HistoryTab'
                ? focused
                  ? 'list'
                  : 'list-outline'
                : route.name === 'WalletTab'
                  ? focused
                    ? 'wallet'
                    : 'wallet-outline'
                  : focused
                    ? 'ellipsis-horizontal-circle'
                    : 'ellipsis-horizontal-circle-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: t('tabs.home') }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{ tabBarLabel: t('tabs.history') }}
      />
      <Tab.Screen
        name="AddTab"
        component={AddTabPlaceholder}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => <AddTabButton {...props} theme={theme} />
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletScreen}
        options={{ tabBarLabel: t('tabs.wallet') }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{ tabBarLabel: t('tabs.more') }}
      />
    </Tab.Navigator>
  );
}

function AddTabPlaceholder() {
  const { theme } = useTheme();

  return <View style={[styles.addPlaceholder, { backgroundColor: theme.colors.background }]} />;
}

const styles = StyleSheet.create({
  addPlaceholder: {
    flex: 1
  }
});
