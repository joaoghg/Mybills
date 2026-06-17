import {
  updateCategoryInputSchema,
  type CategoryIcon,
  type CategoryTransactionType
} from '@mybills/dtos';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { CategoryIconPicker } from '@/features/categories/components/category-icon-picker';
import { CategoryTypePicker } from '@/features/categories/components/category-type-picker';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { useUpdateCategory } from '@/features/categories/hooks/use-update-category';
import { translateCreateCategoryError } from '@/features/categories/utils/create-category-error';
import { translateCreateCategoryZodError } from '@/features/categories/utils/create-category-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';

type Props = NativeStackScreenProps<RootStackParamList, 'EditCategory'>;

export function EditCategoryScreen({ navigation, route }: Props) {
  const { categoryId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { data: categories = [], isLoading } = useCategories();
  const category = categories.find((item) => item.id === categoryId);
  const { mutate, isPending, isError, error } = useUpdateCategory();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<CategoryIcon>('receipt-outline');
  const [selectedTypes, setSelectedTypes] = useState<CategoryTransactionType[]>(['EXPENSE']);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleToggleType(type: CategoryTransactionType) {
    setSelectedTypes((current) => {
      if (current.includes(type)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== type);
      }
      return [...current, type];
    });
  }

  useEffect(() => {
    if (!category) {
      return;
    }
    setName(category.name);
    setSelectedIcon(category.icon);
    setSelectedTypes(category.types);
  }, [category]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('categories.editTitle') });
  }, [navigation, t]);

  const remoteMessage =
    isError && error ? translateCreateCategoryError(error, t) : null;
  const displayError = localError ?? remoteMessage;

  function handleSubmit() {
    setLocalError(null);

    const parsed = updateCategoryInputSchema.safeParse({
      name,
      icon: selectedIcon,
      types: selectedTypes
    });
    if (!parsed.success) {
      setLocalError(translateCreateCategoryZodError(t, parsed.error));
      return;
    }

    mutate(
      { categoryId, input: parsed.data },
      {
        onSuccess: () => {
          navigation.goBack();
        }
      }
    );
  }

  if (isLoading && !category) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!category) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, padding: 24 }]}>
        <Text style={[styles.notFound, { color: theme.colors.textSecondary }]}>
          {t('categories.notFound')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.form}>
        <InputField
          theme={theme}
          label={t('categories.nameLabel')}
          placeholder={t('categories.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <CategoryIconPicker
          theme={theme}
          selectedIcon={selectedIcon}
          onSelect={setSelectedIcon}
        />

        <CategoryTypePicker
          theme={theme}
          selectedTypes={selectedTypes}
          onToggle={handleToggleType}
        />

        {displayError ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.errorText, { color: theme.colors.danger }]}
          >
            {displayError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isPending }}
          disabled={isPending}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.colors.primary },
            isPending && styles.primaryButtonDisabled,
            pressed && !isPending && styles.primaryButtonPressed
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.textOnPrimary }]}>
            {isPending ? t('categories.updateLoading') : t('categories.updateSubmit')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14
  },
  form: {
    gap: 14
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 4
  },
  primaryButtonDisabled: {
    opacity: 0.65
  },
  primaryButtonPressed: {
    opacity: 0.92
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800'
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notFound: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600'
  }
});
