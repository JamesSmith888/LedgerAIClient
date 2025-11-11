import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BorderRadius,
  Colors,
  FontSizes,
  FontWeights,
  Shadows,
  Spacing,
} from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { toast } from '../utils/toast';
import type { Category, Transaction, TransactionType } from '../types/transaction';
import { LedgerType } from '../types/ledger';
import { CategorySelector } from '../components/transaction/CategorySelector';
import { NumberKeypad } from '../components/transaction/NumberKeypad';
import { LedgerSelector } from '../components/ledger/LedgerSelector';
import { useCategories } from '../context/CategoryContext';
import { useLedger } from '../context/LedgerContext';
import { transactionAPI } from '../api/services';
import { CategoryPicker } from '../components/transaction/CategoryPicker';
import { DatePicker } from '../components/transaction/DatePicker';

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // ========== 上下文和状态 ==========
  const { user } = useAuth(); // ✨ 获取用户信息
  const { expenseCategories, incomeCategories, isLoading: categoriesLoading } = useCategories();
  const { ledgers, currentLedger, setCurrentLedger } = useLedger();

  // 记账核心状态
  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());

  // UI 状态
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ========== 初始化和副作用 ==========
  // 切换收支类型时，重置分类和金额
  useEffect(() => {
    setSelectedCategory(undefined);
  }, [transactionType]);

  // 页面聚焦时，默认选中第一个支出分类
  useFocusEffect(
    useCallback(() => {
      if (transactionType === 'EXPENSE' && expenseCategories.length > 0) {
        setSelectedCategory(expenseCategories[0]);
      } else if (transactionType === 'INCOME' && incomeCategories.length > 0) {
        setSelectedCategory(incomeCategories[0]);
      }
    }, [expenseCategories, incomeCategories, transactionType])
  );

  // ========== 事件处理 ==========

  // 切换收支类型
  const handleTypeChange = (type: TransactionType) => {
    if (type !== transactionType) {
      setTransactionType(type);
      setAmount('0'); // 重置金额
    }
  };

  // 处理数字键盘输入
  const handleNumberPress = (number: string) => {
    if (amount.includes('.') && amount.split('.')[1].length >= 2) {
      return; // 小数点后最多两位
    }
    if (amount === '0' && number !== '.') {
      setAmount(number);
    } else {
      setAmount(prev => prev + number);
    }
  };

  // 处理删除键
  const handleDeletePress = () => {
    setAmount(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  // 获取最终要保存的金额
  const getFinalAmount = (): number => {
    const finalAmount = parseFloat(amount);
    return isNaN(finalAmount) ? 0 : finalAmount;
  };

  // 获取交易日期（此处简化为当前时间）
  const getTransactionDate = (): Date => {
    return transactionDate;
  };

  // 快速保存
  const handleQuickSave = async () => {
    const finalAmount = getFinalAmount();

    // 验证
    if (finalAmount <= 0) {
      toast.info('请输入有效金额');
      return;
    }
    if (!selectedCategory) {
      toast.info('请选择一个分类');
      return;
    }

    try {
      setIsLoading(true);
      Keyboard.dismiss();

      const transactionData = {
        type: transactionType,
        amount: finalAmount,
        categoryId: selectedCategory.id,
        description: description.trim(),
        date: getTransactionDate().toISOString(),
        ledgerId: currentLedger?.id,
        accountId: user?._id, // ✨ 修正：使用 _id
      };

      await transactionAPI.create(transactionData as Omit<Transaction, 'id'>);

      toast.success('记账成功！');
      setTimeout(() => navigation.goBack(), 300);
    } catch (error) {
      console.error('保存交易失败:', error);
      toast.error('保存失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== 渲染 ==========
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.backgroundSecondary}
      />

      {/* ========== ✨ 新增：关闭按钮 ========== */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ========== 区域1: 金额 & 收支类型 ========== */}
        <View style={styles.amountSection}>
          {/* 收支切换 */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                transactionType === 'EXPENSE' && styles.typeButtonActive,
              ]}
              onPress={() => handleTypeChange('EXPENSE')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === 'EXPENSE' && styles.typeButtonTextActive,
                ]}
              >
                支出
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                transactionType === 'INCOME' && styles.typeButtonActive,
              ]}
              onPress={() => handleTypeChange('INCOME')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === 'INCOME' && styles.typeButtonTextActive,
                ]}
              >
                收入
              </Text>
            </TouchableOpacity>
          </View>

          {/* 金额显示 */}
          <View style={styles.amountDisplayContainer}>
            <Text style={styles.currencySymbol}>¥</Text>
            <Text
              style={[
                styles.amountText,
                transactionType === 'EXPENSE'
                  ? styles.amountTextExpense
                  : styles.amountTextIncome,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {getFinalAmount().toLocaleString()}
            </Text>
          </View>
        </View>

        {/* ========== 区域2: 详情列表 ========== */}
        <View style={styles.detailsSection}>
          {/* 分类 */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => setShowCategoryPicker(true)}
          >
            <View style={styles.detailRowLeft}>
              <Text style={styles.detailIcon}>
                {selectedCategory?.icon || '🏷️'}
              </Text>
              <Text style={styles.detailLabel}>分类</Text>
            </View>
            <View style={styles.detailRowRight}>
              <Text style={styles.detailValue}>
                {selectedCategory?.name || '请选择'}
              </Text>
              <Text style={styles.detailArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* 账本 */}
          {ledgers.length > 1 && (
            <View style={styles.detailRow}>
              <LedgerSelector
                mode="flat"
                ledgers={ledgers}
                currentLedger={currentLedger}
                onSelect={ledger => {
                  setCurrentLedger(ledger);
                }}
              />
            </View>
          )}

          {/* 日期 */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.detailRowLeft}>
              <Text style={styles.detailIcon}>🗓️</Text>
              <Text style={styles.detailLabel}>日期</Text>
            </View>
            <View style={styles.detailRowRight}>
              <Text style={styles.detailValue}>
                {formatDate(getTransactionDate())}
              </Text>
              <Text style={styles.detailArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* 备注 */}
          <View style={styles.descriptionRow}>
            <Text style={styles.detailIcon}>✍️</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="添加备注..."
              placeholderTextColor={Colors.textLight}
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* ========== 区域3: 数字键盘 ========== */}
        <View style={styles.keypadSection}>
          <NumberKeypad
            onNumberPress={handleNumberPress}
            onDeletePress={handleDeletePress}
          />
        </View>

        {/* 底部安全区域填充 */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ========== 底部保存按钮 ========== */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.saveButton,
            transactionType === 'EXPENSE'
              ? styles.saveButtonExpense
              : styles.saveButtonIncome,
            isLoading && styles.saveButtonDisabled,
          ]}
          onPress={handleQuickSave}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>保 存</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ========== 分类选择器 Modal ========== */}
      <CategoryPicker
        visible={showCategoryPicker}
        categories={
          transactionType === 'EXPENSE' ? expenseCategories : incomeCategories
        }
        onSelect={category => {
          setSelectedCategory(category);
          setShowCategoryPicker(false);
        }}
        onClose={() => setShowCategoryPicker(false)}
        currentCategory={selectedCategory}
        title={transactionType === 'EXPENSE' ? '选择支出分类' : '选择收入分类'}
      />

      {/* ========== 日期选择器 Modal ========== */}
      <DatePicker
        visible={showDatePicker}
        onSelect={date => {
          setTransactionDate(date);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
        currentDate={transactionDate}
      />
    </View>
  );
};

// ========== 💡 学习点：格式化日期函数 ==========
const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '今天';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

// ========== 样式 ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  closeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },

  // ========== 金额区域 ==========
  amountSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.background,
    ...Shadows.sm,
  },
  typeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  typeButtonTextActive: {
    color: Colors.text,
    fontWeight: FontWeights.semibold,
  },
  amountDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  currencySymbol: {
    fontSize: FontSizes.xxxl,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
    fontWeight: FontWeights.medium,
  },
  amountText: {
    fontSize: 64,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  amountTextExpense: {
    color: Colors.expense,
  },
  amountTextIncome: {
    color: Colors.income,
  },

  // ========== 详情列表区域 ==========
  detailsSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.md,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  detailValue: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  detailArrow: {
    fontSize: FontSizes.lg,
    color: Colors.textLight,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  descriptionInput: {
    flex: 1,
    fontSize: FontSizes.lg,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },

  // ========== 键盘区域 ==========
  keypadSection: {
    paddingHorizontal: Spacing.md,
  },

  // ========== 底部栏 ==========
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
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
    fontWeight: FontWeights.bold,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
