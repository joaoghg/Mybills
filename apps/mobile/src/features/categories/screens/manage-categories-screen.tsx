import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { CategoryListItem } from '@/features/categories/components/category-list-item';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { useDeleteCategory } from '@/features/categories/hooks/use-delete-category';
import { translateCreateCategoryError } from '@/features/categories/utils/create-category-error';
import { navigateRoot } from '@/navigation/root-navigation-ref';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryManagement'>;

export function ManageCategoriesScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: categories = [], isLoading, isError, error, refetch, isRefetching } =
    useCategories();
  const { mutate: deleteCategory, isPending: isDeleting, variables: deletingId } =
    useDeleteCategory();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('categories.manageTitle') });
  }, [navigation, t]);

  function handleAddCategory() {
    navigateRoot('AddCategory');
  }

  function handleEditCategory(categoryId: string) {
    navigation.navigate('EditCategory', { categoryId });
  }

  function confirmDelete(categoryId: string, categoryName: string) {
    Alert.alert(
      t('categories.deleteConfirmTitle'),
      t('categories.deleteConfirmMessage', { name: categoryName }),
      [
        { text: t('categories.deleteCancel'), style: 'cancel' },
        {
          text: t('categories.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            setDeleteError(null);
            deleteCategory(categoryId, {
              onError: (err) => {
                setDeleteError(translateCreateCategoryError(err, t));
              }
            });
          }
        }
      ]
    );
  }

  const listHeader = (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroEyebrow, { color: theme.colors.primary }]}>
            {t('categories.manageEyebrow')}
          </Text>
          <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
            {t('categories.manageHeadline')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
            {t('categories.manageSubtitle')}
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
          <Text style={[styles.countValue, { color: theme.colors.primary }]}>
            {categories.length}
          </Text>
          <Text style={[styles.countLabel, { color: theme.colors.primary }]}>
            {t('categories.manageCountLabel')}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleAddCategory}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: theme.colors.primary },
          pressed && styles.addButtonPressed
        ]}
      >
        <Ionicons name="add" size={20} color={theme.colors.textOnPrimary} />
        <Text style={[styles.addButtonLabel, { color: theme.colors.textOnPrimary }]}>
          {t('categories.addNew')}
        </Text>
      </Pressable>

      {deleteError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.errorBanner, { color: theme.colors.danger }]}>
          {deleteError}
        </Text>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, padding: 24 }]}>
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>
          {translateCreateCategoryError(error, t)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => refetch()}
          style={[styles.retryButton, { borderColor: theme.colors.primary }]}
        >
          <Text style={[styles.retryLabel, { color: theme.colors.primary }]}>
            {t('categories.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: insets.bottom + 24, backgroundColor: theme.colors.background }
      ]}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: `${theme.colors.primary}12` }]}>
            <Ionicons name="grid-outline" size={28} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            {t('categories.emptyTitle')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            {t('categories.emptySubtitle')}
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <CategoryListItem
          theme={theme}
          category={item}
          editLabel={t('categories.editAction')}
          deleteLabel={t('categories.deleteAction')}
          isDeleting={isDeleting && deletingId === item.id}
          onEdit={() => handleEditCategory(item.id)}
          onDelete={() => confirmDelete(item.id, item.name)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexGrow: 1
  },
  hero: {
    gap: 16,
    marginBottom: 20
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14
  },
  heroCopy: {
    flex: 1,
    gap: 6
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase'
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 21
  },
  countBadge: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    gap: 2
  },
  countValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 18
  },
  addButtonPressed: {
    opacity: 0.92
  },
  addButtonLabel: {
    fontSize: 15,
    fontWeight: '800'
  },
  errorBanner: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  separator: {
    height: 10
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 10
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600'
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '700'
  }
});
