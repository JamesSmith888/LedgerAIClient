import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Category } from '../../types/transaction';
import {
  BorderRadius,
  Colors,
  FontSizes,
  Spacing,
  Shadows,
} from '../../constants/theme';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory?: Category;
  onSelect: (category: Category) => void;
  // 新增的布局选项
  layout?: 'horizontal' | 'grid';
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelect,
  layout = 'grid',
}) => {
  return (
    <View style={styles.container}>
      <View style={layout === 'grid' ? styles.grid : styles.horizontal}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              selectedCategory?.id === category.id &&
                styles.categoryItemSelected,
              selectedCategory?.id === category.id && {
                borderColor: category.color,
              },
            ]}
            onPress={() => onSelect(category)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryName,
                selectedCategory?.id === category.id &&
                  styles.categoryNameSelected,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  horizontal: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  categoryItem: {
    width: '22%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  categoryItemSelected: {
    backgroundColor: '#F0F1FF',
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
    ...Shadows.md,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryNameSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },
});
