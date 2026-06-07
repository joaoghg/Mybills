import { createCategoryInputSchema, type CategoryIcon, type CategoryTransactionType } from '@mybills/dtos';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { CategoryIconPicker } from '@/features/categories/components/category-icon-picker';
import { CategoryTypePicker } from '@/features/categories/components/category-type-picker';
import { useCreateCategory } from '@/features/categories/hooks/use-create-category';
import { translateCreateCategoryError } from '@/features/categories/utils/create-category-error';
import { translateCreateCategoryZodError } from '@/features/categories/utils/create-category-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCategory'>;

const DEFAULT_ICON: CategoryIcon = 'receipt-outline';

export function CreateCategoryScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { mutate, isPending, isError, error } = useCreateCategory();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<CategoryIcon>(DEFAULT_ICON);
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

  const remoteMessage =
    isError && error ? translateCreateCategoryError(error, t) : null;
  const displayError = localError ?? remoteMessage;

  function handleSubmit() {
    setLocalError(null);

    const parsed = createCategoryInputSchema.safeParse({
      name,
      icon: selectedIcon,
      types: selectedTypes
    });
    if (!parsed.success) {
      setLocalError(translateCreateCategoryZodError(t, parsed.error));
      return;
    }

    mutate(parsed.data, {
      onSuccess: () => {
        navigation.goBack();
      }
    });
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
            style={[styles.errorText, styles.errorColor]}
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
            {isPending ? t('categories.submitLoading') : t('categories.submit')}
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
  errorColor: {
    color: '#c62828'
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
  }
});
