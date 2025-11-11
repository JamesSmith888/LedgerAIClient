import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Colors,
  FontSizes,
  FontWeights,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import type { Category } from '../../types/transaction';

interface CategoryPickerProps {
  visible: boolean;
  categories: Category[];
  onSelect: (category: Category) => void;
  onClose: () => void;
  currentCategory?: Category;
  title: string;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  visible,
  categories,
  onSelect,
  onClose,
  currentCategory,
  title,
}) => {
  const quickCategories = React.useMemo(
    () => categories.slice(0, Math.min(categories.length, 6)),
    [categories]
  );

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isActive = currentCategory?.id === item.id;
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => onSelect(item)}
      >
        <View
          style={[
            styles.iconContainer,
            isActive && { backgroundColor: Colors.primary, borderColor: Colors.primary },
          ]}
        >
          <Text style={styles.icon}>{item.icon}</Text>
        </View>
        <Text
          style={[styles.name, isActive && { color: Colors.primary }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.overlayBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {quickCategories.length > 0 && (
            <View style={styles.quickSection}>
              <Text style={styles.sectionTitle}>常用分类</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickChips}
              >
                {quickCategories.map(category => {
                  const isActive = currentCategory?.id === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.quickChip,
                        isActive && styles.quickChipActive,
                      ]}
                      onPress={() => onSelect(category)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          isActive && styles.quickChipTextActive,
                        ]}
                      >
                        {category.icon} {category.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id.toString()}
            numColumns={5}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '60%',
    paddingBottom: Spacing.lg,
  },
  quickSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: FontWeights.medium,
  },
  quickChips: {
    flexDirection: 'row',
    paddingRight: Spacing.md,
  },
  quickChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  quickChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  quickChipTextActive: {
    color: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  closeText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  list: {
    padding: Spacing.md,
  },
  itemContainer: {
    alignItems: 'center',
    width: '20%',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  icon: {
    fontSize: 24,
  },
  name: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
