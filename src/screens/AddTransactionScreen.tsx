import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { CategorySelector } from '../components/transaction/CategorySelector';
import { QuickAmountSelector } from '../components/transaction/QuickAmountSelector';
import { QuickTimeSelector } from '../components/transaction/QuickTimeSelector';
import { DetailedInputPanel } from '../components/transaction/DetailedInputPanel';
import {
  Category,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TransactionType,
  Transaction,
} from '../types/transaction';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';

export const AddTransactionScreen: React.FC = () => {
  // ========== 状态管理 ==========
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [quickAmount, setQuickAmount] = useState<number | undefined>();
  const [customAmount, setCustomAmount] = useState<string>('0');
  const [selectedDaysAgo, setSelectedDaysAgo] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [showDetailedInput, setShowDetailedInput] = useState<boolean>(false);

  // 当前显示的分类列表
  const currentCategories = transactionType === 'expense'
    ? EXPENSE_CATEGORIES
    : INCOME_CATEGORIES;

  // 获取最终金额（优先自定义，否则快速选择）
  const getFinalAmount = (): number => {
    if (showDetailedInput && parseFloat(customAmount) > 0) {
      return parseFloat(customAmount);
    }
    return quickAmount || 0;
  };

  // ========== 处理函数 ==========

  // 切换收支类型
  const handleTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    setSelectedCategory(undefined);
  };

  // 选择快速金额
  const handleQuickAmountSelect = (amount: number) => {
    setQuickAmount(amount);
    setCustomAmount('0'); // 清空自定义金额
  };

  // 处理数字输入（详细录入）
  const handleNumberPress = (num: string) => {
    setQuickAmount(undefined); // 清空快速选择

    if (num === '.' && customAmount.includes('.')) {
      return;
    }

    if (customAmount === '0' && num !== '.') {
      setCustomAmount(num);
    } else {
      const parts = (customAmount + num).split('.');
      if (parts[1] && parts[1].length > 2) {
        return;
      }
      setCustomAmount(customAmount + num);
    }
  };

  // 处理删除
  const handleDeletePress = () => {
    if (customAmount.length === 1) {
      setCustomAmount('0');
    } else {
      setCustomAmount(customAmount.slice(0, -1));
    }
  };

  // 计算日期
  const getTransactionDate = (): Date => {
    const date = new Date();
    date.setDate(date.getDate() - selectedDaysAgo);
    return date;
  };

  // 快速保存（简单录入）
  const handleQuickSave = () => {
    const finalAmount = getFinalAmount();

    // 验证
    if (!selectedCategory) {
      Alert.alert('提示', '请选择分类');
      return;
    }

    if (finalAmount <= 0) {
      Alert.alert('提示', '请选择或输入金额');
      return;
    }

    saveTransaction(finalAmount);
  };

  // 保存交易
  const saveTransaction = (amount: number) => {
    if (!selectedCategory) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: transactionType,
      amount: amount,
      category: selectedCategory,
      description: description.trim(),
      date: getTransactionDate(),
    };

    console.log('✅ 保存交易:', transaction);

    // TODO: 调用 API 保存
    // await transactionAPI.create(transaction);

    Alert.alert(
      '记账成功 ✓',
      `${transactionType === 'expense' ? '支出' : '收入'}: ¥${amount}\n分类: ${selectedCategory.name}`,
      [
        {
          text: '继续记账',
          onPress: resetForm,
        },
        {
          text: '完成',
          style: 'cancel',
          onPress: resetForm,
        },
      ]
    );
  };

  // 重置表单
  const resetForm = () => {
    setQuickAmount(undefined);
    setCustomAmount('0');
    setSelectedCategory(undefined);
    setDescription('');
    setSelectedDaysAgo(0);
    setShowDetailedInput(false);
  };

  // ========== 渲染 ==========
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* ========== 顶部标题栏 ========== */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>记一笔</Text>
        </View>

        {/* ========== 收支切换 ========== */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'expense' && styles.typeButtonActiveExpense,
            ]}
            onPress={() => handleTypeChange('expense')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.typeButtonText,
                transactionType === 'expense' && styles.typeButtonTextActive,
              ]}
            >
              💸 支出
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'income' && styles.typeButtonActiveIncome,
            ]}
            onPress={() => handleTypeChange('income')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.typeButtonText,
                transactionType === 'income' && styles.typeButtonTextActive,
              ]}
            >
              💰 收入
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========== 分类选择（网格布局） ========== */}
        <CategorySelector
          categories={currentCategories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
          layout="grid"
        />

        {/* ========== 快速金额选择 ========== */}
        <QuickAmountSelector
          selectedAmount={quickAmount}
          onSelect={handleQuickAmountSelect}
        />

        {/* ========== 时间选择 ========== */}
        <QuickTimeSelector
          selectedDaysAgo={selectedDaysAgo}
          onSelect={setSelectedDaysAgo}
        />

        {/* ========== 详细录入开关 ========== */}
        <TouchableOpacity
          style={styles.detailedToggle}
          onPress={() => setShowDetailedInput(!showDetailedInput)}
          activeOpacity={0.7}
        >
          <Text style={styles.detailedToggleText}>
            {showDetailedInput ? '📝 收起详细录入' : '✏️ 展开详细录入'}
          </Text>
          <Text style={styles.detailedToggleIcon}>
            {showDetailedInput ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {/* ========== 详细录入面板（折叠） ========== */}
        <DetailedInputPanel
          isExpanded={showDetailedInput}
          amount={customAmount}
          description={description}
          onAmountChange={setCustomAmount}
          onDescriptionChange={setDescription}
          onNumberPress={handleNumberPress}
          onDeletePress={handleDeletePress}
        />

        {/* 底部占位 */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ========== 底部保存按钮（简单录入） ========== */}
      {!showDetailedInput && (
        <View style={styles.bottomBar}>
          <View style={styles.amountPreview}>
            <Text style={styles.amountPreviewLabel}>金额：</Text>
            <Text style={[
              styles.amountPreviewValue,
              { color: transactionType === 'expense' ? Colors.error : Colors.success }
            ]}>
              ¥{getFinalAmount().toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              transactionType === 'expense'
                ? styles.saveButtonExpense
                : styles.saveButtonIncome
            ]}
            onPress={handleQuickSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              快速保存 ✓
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========== 详细录入保存按钮 ========== */}
      {showDetailedInput && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              styles.saveButtonFull,
              transactionType === 'expense'
                ? styles.saveButtonExpense
                : styles.saveButtonIncome
            ]}
            onPress={handleQuickSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              保存记账 ✓
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ========== 样式 ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },

  // 收支切换
  typeSelector: {
    flexDirection: 'row',
    margin: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: 6,
    gap: 6,
    ...Shadows.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActiveExpense: {
    backgroundColor: Colors.expense,
    borderColor: Colors.expense,
    ...Shadows.md,
  },
  typeButtonActiveIncome: {
    backgroundColor: Colors.income,
    borderColor: Colors.income,
    ...Shadows.md,
  },
  typeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  typeButtonTextActive: {
    color: Colors.surface,
  },

  // 详细录入开关
  detailedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    borderStyle: 'dashed',
    ...Shadows.sm,
  },
  detailedToggleText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  detailedToggleIcon: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '700',
  },

  // 底部栏
  bottomBar: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.lg,
  },
  amountPreview: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  amountPreviewLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  amountPreviewValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  saveButtonFull: {
    flex: 0,
    width: '100%',
  },
  saveButtonExpense: {
    backgroundColor: Colors.expense,
  },
  saveButtonIncome: {
    backgroundColor: Colors.income,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
