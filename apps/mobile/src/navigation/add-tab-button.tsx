import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AppTheme } from '../core/theme';
import type { RootStackParamList } from './types';

type AddTabButtonProps = BottomTabBarButtonProps & {
  theme: AppTheme;
};

export function AddTabButton({
  theme,
  accessibilityState,
  accessibilityLabel,
  style,
  testID,
  onLongPress,
  delayLongPress
}: AddTabButtonProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      style={[styles.wrapper, style]}
      onPress={() => {
        navigation.navigate('AddPlaceholder');
      }}
    >
      <View style={[styles.fab, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="add" size={28} color={theme.colors.textOnPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6
  }
});
