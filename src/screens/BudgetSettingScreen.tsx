/**
 * 预算设置页面
 * 允许用户设置月度总预算和分类预算
 */
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { toast } from '../utils/toast';
import { budgetAPI } from '../api/services/budgetAPI';
import { categoryAPI, CategoryResponse } from '../api/services/categoryAPI';
import { BudgetOverview } from '../types/budget';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSizes,
  FontWeights,
  Shadows,
} from '../constants/theme';

interface CategoryBudgetItem {
  categoryId: number;
  categoryName: string;
  amount: string;
}

export const BudgetSettingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { ledgerId: number } | undefined;
  const ledgerId = params?.ledgerId;

  const [totalBudget, setTotalBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetItem[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [currentBudget, setCurrentBudget] = useState<BudgetOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [ledgerId]);

  const loadData = async () => {
    if (!ledgerId) return;

    try {
      setIsLoading(true);
      const [budgetData, categoryData] = await Promise.all([
        budgetAPI.getBudgetOverview(ledgerId).catch(() => null),
        categoryAPI.getAll(),
      ]);

      if (budgetData) {
        setCurrentBudget(budgetData);
        setTotalBudget(budgetData.totalBudget.toString());
        
        // 加载分类预算
        const catBudgets = budgetData.categoryBudgets?.map(cb => ({
          categoryId: cb.categoryId,
          categoryName: cb.categoryName,
          amount: cb.budgetAmount.toString(),
        })) || [];
        setCategoryBudgets(catBudgets);
      }

      setCategories(categoryData);
    } catch (error) {
      console.error('加载预算数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = (category: CategoryResponse) => {
    // 检查是否已添加
    if (categoryBudgets.some(cb => cb.categoryId === category.id)) {
      toast.info('该分类已添加');
      return;
    }

    setCategoryBudgets([
      ...categoryBudgets,
      {
        categoryId: category.id,
        categoryName: category.name,
        amount: '',
      },
    ]);
    setShowCategoryPicker(false);
  };

  const handleRemoveCategory = (categoryId: number) => {
    setCategoryBudgets(categoryBudgets.filter(cb => cb.categoryId !== categoryId));
  };

  const handleUpdateCategoryAmount = (categoryId: number, amount: string) => {
    setCategoryBudgets(
      categoryBudgets.map(cb =>
        cb.categoryId === categoryId ? { ...cb, amount } : cb
      )
    );
  };

  const handleSave = async () => {
    if (!ledgerId) return;

    // 验证总预算
    const totalAmount = parseFloat(totalBudget);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      toast.error('请输入有效的总预算金额');
      return;
    }

    // 验证分类预算
    for (const cb of categoryBudgets) {
      const amount = parseFloat(cb.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error(`请为${cb.categoryName}输入有效的预算金额`);
        return;
      }
    }

    try {
      setIsSaving(true);
      await budgetAPI.setBudget({
        ledgerId,
        totalAmount,
        categoryBudgets: categoryBudgets.map(cb => ({
          categoryId: cb.categoryId,
          amount: parseFloat(cb.amount),
        })),
      });

      toast.success('预算设置成功');
      navigation.goBack();
    } catch (error) {
      console.error('保存预算失败:', error);
      toast.error('保存预算失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const availableCategories = categories.filter(
    cat => !categoryBudgets.some(cb => cb.categoryId === cat.id)
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* 顶部栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>设置预算</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 当前预算信息 */}
          {currentBudget && (
            <View style={styles.currentBudgetCard}>
              <Text style={styles.cardTitle}>当前预算状态</Text>
              <View style={styles.budgetRow}>
                <View>
                  <Text style={styles.label}>总预算</Text>
                  <Text style={styles.amount}>¥{currentBudget.totalBudget.toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={styles.label}>已用</Text>
                  <Text style={styles.amount}>¥{currentBudget.totalExpense.toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={styles.label}>剩余</Text>
                  <Text style={[styles.amount, {
                    color: currentBudget.remainingBudget < 0 ? Colors.error : Colors.text
                  }]}>
                    ¥{currentBudget.remainingBudget.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 总预算设置 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>月度总预算</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.currencySymbol}>¥</Text>
              <TextInput
                style={styles.input}
                placeholder="输入总预算金额"
                placeholderTextColor={Colors.textSecondary}
                value={totalBudget}
                onChangeText={setTotalBudget}
                keyboardType="decimal-pad"
                editable={!isSaving}
              />
            </View>
          </View>

          {/* 分类预算设置 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>分类预算</Text>
              <Text style={styles.sectionHelper}>可选</Text>
            </View>

            {categoryBudgets.length > 0 && (
              <View style={styles.categoryList}>
                {categoryBudgets.map((cb, index) => (
                  <View key={cb.categoryId} style={styles.categoryItem}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{cb.categoryName}</Text>
                      <View style={styles.categoryInputGroup}>
                        <Text style={styles.currencySymbol}>¥</Text>
                        <TextInput
                          style={[styles.input, styles.categoryInput]}
                          placeholder="预算金额"
                          placeholderTextColor={Colors.textSecondary}
                          value={cb.amount}
                          onChangeText={(text) => handleUpdateCategoryAmount(cb.categoryId, text)}
                          keyboardType="decimal-pad"
                          editable={!isSaving}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveCategory(cb.categoryId)}
                      disabled={isSaving}
                    >
                      <Icon name="close-circle" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {availableCategories.length > 0 && (
              <TouchableOpacity
                style={styles.addCategoryBtn}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                disabled={isSaving}
              >
                <Icon name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addCategoryText}>添加分类预算</Text>
              </TouchableOpacity>
            )}

            {showCategoryPicker && availableCategories.length > 0 && (
              <View style={styles.categoryPicker}>
                {availableCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryOption}
                    onPress={() => handleAddCategory(cat)}
                  >
                    <View style={[styles.categoryColor, { backgroundColor: cat.color || Colors.primary }]} />
                    <Text style={styles.categoryOptionText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 提示信息 */}
          <View style={styles.tipsSection}>
            <Icon name="information-circle" size={16} color={Colors.textSecondary} />
            <Text style={styles.tipsText}>
              可以只设置月度总预算，分类预算是可选的。设置后可随时修改。
            </Text>
          </View>
        </ScrollView>

        {/* 保存按钮 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>保存预算设置</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  currentBudgetCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  label: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  amount: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  sectionHelper: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  currencySymbol: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  categoryList: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  categoryInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background,
  },
  categoryInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  addCategoryText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  categoryPicker: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  categoryOptionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  tipsSection: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tipsText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
});
