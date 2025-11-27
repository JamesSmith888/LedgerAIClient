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
import { CategoryIcon } from '../common/CategoryIcon';

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
          <CategoryIcon icon={item.icon} size={24} color={isActive ? Colors.surface : Colors.text} />
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
