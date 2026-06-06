import { Ionicons } from '@expo/vector-icons';
import type { CategoryOutput } from '@mybills/dtos';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type CategoryListItemProps = {
  theme: AppTheme;
  category: CategoryOutput;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
};

export function CategoryListItem({
  theme,
  category,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  isDeleting = false
}: CategoryListItemProps) {
  const iconName = category.icon as ComponentProps<typeof Ionicons>['name'];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.textPrimary
        }
      ]}
    >
      <View style={[styles.accent, { backgroundColor: theme.colors.primary }]} />
      <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
        <Ionicons name={iconName} size={22} color={theme.colors.primary} />
      </View>
      <Text
        style={[styles.name, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
        accessibilityRole="text"
      >
        {category.name}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editLabel}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.colors.surfaceAlt },
            pressed && styles.actionPressed
          ]}
        >
          <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
          accessibilityState={{ disabled: isDeleting }}
          disabled={isDeleting}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: `${theme.colors.danger}14` },
            isDeleting && styles.actionDisabled,
            pressed && !isDeleting && styles.actionPressed
          ]}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingRight: 12,
    paddingLeft: 0,
    gap: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  actions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionPressed: {
    opacity: 0.88
  },
  actionDisabled: {
    opacity: 0.5
  }
});
