import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
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
import { showConfirm } from '../utils/toast';
import type { Category, Transaction, TransactionType } from '../types/transaction';
import type { Ledger } from '../types/ledger';
import { LedgerType } from '../types/ledger';
import { CategorySelector } from '../components/transaction/CategorySelector';
import { NumberKeypad } from '../components/transaction/NumberKeypad';
import { LedgerSelector } from '../components/ledger/LedgerSelector';
import { useCategories } from '../context/CategoryContext';
import { useLedger } from '../context/LedgerContext';
import { transactionAPI, categoryAPI } from '../api/services';
import { CategoryPicker } from '../components/transaction/CategoryPicker';
import { DatePicker } from '../components/transaction/DatePicker';
import { PaymentMethodPicker } from '../components/transaction/PaymentMethodPicker';
import { usePaymentMethod } from '../context/PaymentMethodContext';
import type { PaymentMethod } from '../types/paymentMethod';
import { Icon } from '../components/common';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { PaymentIcon } from '../components/payment/PaymentIcon';
import { CollapsibleSection } from '../components/common/CollapsibleSection';
import { ImageAttachmentPicker, AttachmentGallery } from '../components/attachment';
import { attachmentAPI } from '../api/services';
import { localAttachmentService } from '../services/localAttachmentService';
import type { StorageType, UnifiedAttachment, LocalAttachment } from '../types/attachment';

interface AddTransactionScreenProps {
  route?: {
    params?: {
      transaction?: Transaction; // 如果传入 transaction，则为编辑模式
      selectedLedger?: Ledger | null; // 从列表页传入的选中账本
    };
  };
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({ route }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  // 编辑模式判断
  const editingTransaction = route?.params?.transaction;
  const isEditMode = !!editingTransaction;
  
  // 获取列表页传入的选中账本
  const selectedLedgerFromList = route?.params?.selectedLedger;

  // 使用 ref 保存导航对象，避免在异步回调中失效
  const navigationRef = useRef(navigation);
  
  // 更新 ref
  useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);

  // ========== 上下文和状态 ==========
  const { user } = useAuth(); // ✨ 获取用户信息
  const { expenseCategories, incomeCategories, isLoading: categoriesLoading } = useCategories();
  const { ledgers, currentLedger, setCurrentLedger } = useLedger();
  const { paymentMethods, defaultPaymentMethod } = usePaymentMethod();
  
  // ========== 初始化账本选择逻辑 ==========
  // 在组件挂载时，如果是新增模式且传入了选中账本，则使用它
  useEffect(() => {
    if (!isEditMode && selectedLedgerFromList && currentLedger?.id !== selectedLedgerFromList.id) {
      console.log('使用列表页选中的账本:', selectedLedgerFromList);
      setCurrentLedger(selectedLedgerFromList);
    }
  }, []);

  // 常用分类状态
  const [frequentExpenseCategories, setFrequentExpenseCategories] = useState<Category[]>([]);
  const [frequentIncomeCategories, setFrequentIncomeCategories] = useState<Category[]>([]);

  // 记账核心状态（编辑模式时初始化为原有数据）
  const [transactionType, setTransactionType] = useState<TransactionType>(
    editingTransaction?.type || 'EXPENSE'
  );
  const [amount, setAmount] = useState(
    editingTransaction ? editingTransaction.amount.toString() : '0'
  );
  const [expression, setExpression] = useState(''); // 新增：用于显示计算表达式
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [transactionDate, setTransactionDate] = useState(
    editingTransaction ? new Date(editingTransaction.transactionDateTime) : new Date()
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | undefined>(undefined);

  // Refs to track state for useFocusEffect without adding dependencies
  const selectedCategoryRef = useRef(selectedCategory);
  const selectedPaymentMethodRef = useRef(selectedPaymentMethod);
  const isEditInitialized = useRef(false);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  useEffect(() => {
    selectedPaymentMethodRef.current = selectedPaymentMethod;
  }, [selectedPaymentMethod]);

  useEffect(() => {
    isEditInitialized.current = false;
  }, [editingTransaction?.id]);

  // 附件状态
  const [attachments, setAttachments] = useState<Array<{uri: string; fileName?: string; type?: string; fileSize?: number; isExisting?: boolean}>>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [storageType, setStorageType] = useState<StorageType>('local'); // 默认本地存储
  const [initialAttachmentCount, setInitialAttachmentCount] = useState(0); // 记录初始附件数量
  const [loadedAttachments, setLoadedAttachments] = useState<UnifiedAttachment[]>([]); // 编辑模式下加载的附件（用于展示）
  const [showGallery, setShowGallery] = useState(false); // 全屏图库状态
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0); // 图库初始索引

  // UI 状态
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);

  // ========== 初始化和副作用 ==========
  // 加载常用分类
  useEffect(() => {
    const loadFrequentCategories = async () => {
      try {
        const [expenseFrequent, incomeFrequent] = await Promise.all([
          categoryAPI.getFrequentCategories('EXPENSE'),
          categoryAPI.getFrequentCategories('INCOME'),
        ]);
        setFrequentExpenseCategories(expenseFrequent);
        setFrequentIncomeCategories(incomeFrequent);
      } catch (error) {
        console.error('加载常用分类失败:', error);
      }
    };
    loadFrequentCategories();
  }, []);
  // 切换收支类型时，重置分类和金额
  useEffect(() => {
    setSelectedCategory(undefined);
  }, [transactionType]);

  // 编辑模式：加载附件（优先加载本地，如果没有则尝试云端）
  useEffect(() => {
    const loadAttachments = async () => {
      if (isEditMode && editingTransaction) {
        try {
          // 先尝试加载本地附件
          const localAttachments = await localAttachmentService.getAttachments(editingTransaction.id);
          if (localAttachments.length > 0) {
            // 将本地附件转换为 ImageAttachment 格式用于显示，标记为已存在
            const imageAttachments = localAttachments.map(att => ({
              uri: localAttachmentService.getFileUri(att.localPath),
              fileName: att.fileName,
              type: att.fileType,
              fileSize: att.fileSize,
              isExisting: true, // 标记为已存在的附件
            }));
            setAttachments(imageAttachments);
            setInitialAttachmentCount(localAttachments.length);
            setStorageType('local');
            // 转换为 UnifiedAttachment 用于 AttachmentGallery
            const unifiedAttachments: UnifiedAttachment[] = localAttachments.map(att => ({
              ...att,
              storageType: 'local' as const,
            }));
            setLoadedAttachments(unifiedAttachments);
            console.log(`加载了 ${localAttachments.length} 个本地附件`);
            return;
          }

          // 如果没有本地附件，尝试加载云端附件
          if (editingTransaction.attachmentCount && editingTransaction.attachmentCount > 0) {
            try {
              const cloudAttachments = await attachmentAPI.list(editingTransaction.id);
              if (cloudAttachments.length > 0) {
                // 云端附件只显示元数据，不实际下载，标记为已存在
                const imageAttachments = cloudAttachments.map(att => ({
                  uri: attachmentAPI.getThumbnailUrl(att.id), // 使用缩略图URL
                  fileName: att.fileName,
                  type: att.fileType,
                  fileSize: att.fileSize,
                  isExisting: true, // 标记为已存在的附件
                }));
                setAttachments(imageAttachments);
                setInitialAttachmentCount(cloudAttachments.length);
                setStorageType('cloud');
                // API 返回的已经是完整的 Attachment 对象，直接使用
                setLoadedAttachments(cloudAttachments);
                console.log(`加载了 ${cloudAttachments.length} 个云端附件`);
              }
            } catch (cloudError) {
              console.warn('加载云端附件失败:', cloudError);
            }
          }
        } catch (error) {
          console.error('加载附件失败:', error);
        }
      }
    };

    loadAttachments();
  }, [isEditMode, editingTransaction]);

  // 页面聚焦时，默认选中第一个支出分类或编辑模式下的分类
  useFocusEffect(
    useCallback(() => {
      // 编辑模式：查找对应的分类和支付方式
      if (isEditMode && editingTransaction) {
        // 如果已经初始化过，就不再重置
        if (isEditInitialized.current) return;

        const categories = editingTransaction.type === 'EXPENSE' ? expenseCategories : incomeCategories;
        
        // 尝试初始化分类
        if (categories.length > 0) {
            const category = categories.find(c => c.id === editingTransaction.categoryId);
            if (category) {
              setSelectedCategory(category);
            }
        }
        
        // 尝试初始化支付方式
        if (editingTransaction.paymentMethodId && paymentMethods.length > 0) {
          const paymentMethod = paymentMethods.find(p => p.id === editingTransaction.paymentMethodId);
          if (paymentMethod) {
            setSelectedPaymentMethod(paymentMethod);
          }
        }

        // 只要分类列表已加载，就标记为已初始化
        if (categories.length > 0) {
            isEditInitialized.current = true;
        }
        return;
      }
      
      // 新增模式：默认选中第一个分类和默认支付方式
      // 使用 ref 检查当前值，避免将 state 加入依赖导致循环
      if (transactionType === 'EXPENSE' && expenseCategories.length > 0 && !selectedCategoryRef.current) {
        setSelectedCategory(expenseCategories[0]);
      } else if (transactionType === 'INCOME' && incomeCategories.length > 0 && !selectedCategoryRef.current) {
        setSelectedCategory(incomeCategories[0]);
      }
      
      // 设置默认支付方式
      if (!selectedPaymentMethodRef.current && defaultPaymentMethod) {
        setSelectedPaymentMethod(defaultPaymentMethod);
      }
    }, [expenseCategories, incomeCategories, transactionType, isEditMode, editingTransaction, paymentMethods, defaultPaymentMethod])
  );

  // ========== 事件处理 ==========

  // 处理账户选择点击
  const handlePaymentMethodClick = () => {
    // 检查是否有账户
    if (paymentMethods.length === 0) {
      showConfirm(
        '暂无账户',
        '您还没有添加收付账户，是否前往设置？',
        () => {
          // 确认：先关闭当前页面，再导航到账户管理页面
          console.log('准备导航到账户管理页面');
          
          // 先关闭当前 modal
          navigation.goBack();
          
          // 使用 CommonActions 进行导航，更可靠
          setTimeout(() => {
            try {
              // 方法1: 使用 dispatch 和 CommonActions
              navigationRef.current.dispatch(
                CommonActions.navigate({
                  name: 'PaymentMethodManagement',
                })
              );
              console.log('✅ 导航命令已发送');
            } catch (error) {
              console.error('❌ 导航失败:', error);
            }
          }, 400);
        }
      );
      return;
    }
    // 有账户：打开选择器
    setShowPaymentMethodPicker(true);
  };

  // 切换收支类型
  const handleTypeChange = (type: TransactionType) => {
    if (type !== transactionType) {
      setTransactionType(type);
      setAmount('0'); // 重置金额
      setExpression(''); // 重置表达式
    }
  };

  // 处理数字键盘输入
  const handleNumberPress = (number: string) => {
    // 处理小数点
    if (number === '.') {
      // 如果已经有小数点，不允许再输入
      if (amount.includes('.')) {
        return;
      }
      // 如果当前是0，添加"0."
      if (amount === '0') {
        setAmount('0.');
        return;
      }
      // 否则直接添加小数点
      setAmount(prev => prev + '.');
      return;
    }
    
    // 处理数字输入
    if (amount.includes('.') && amount.split('.')[1].length >= 2) {
      return; // 小数点后最多两位
    }
    if (amount === '0') {
      setAmount(number);
    } else {
      setAmount(prev => prev + number);
    }
  };

  // 处理操作符（加减）
  const handleOperatorPress = (operator: '+' | '-') => {
    const currentAmount = parseFloat(amount);
    if (isNaN(currentAmount) || currentAmount === 0) {
      return;
    }

    // 将当前金额添加到表达式中
    const newExpression = expression ? `${expression} ${amount} ${operator}` : `${amount} ${operator}`;
    setExpression(newExpression);
    setAmount('0'); // 重置输入，等待下一个数字
  };

  // 处理等号按钮 - 完成计算
  const handleEquals = () => {
    if (!expression) {
      // 没有表达式，无需计算
      return;
    }

    const currentAmount = parseFloat(amount);
    if (isNaN(currentAmount) && amount !== '0') {
      return;
    }

    // 构建完整表达式：expression + amount
    // 例如："12 + " + "5" = "12 + 5"
    const fullExpression = currentAmount !== 0 || amount !== '0' 
      ? `${expression} ${amount}`
      : expression.trim().replace(/[+\-]\s*$/, ''); // 如果amount是0，移除末尾操作符

    // 解析并计算
    const tokens = fullExpression.split(/\s+/);
    if (tokens.length === 0) {
      return;
    }

    let result = parseFloat(tokens[0]);
    
    for (let i = 1; i < tokens.length; i += 2) {
      if (i + 1 >= tokens.length) break;
      
      const operator = tokens[i];
      const operand = parseFloat(tokens[i + 1]);
      
      if (isNaN(operand)) continue;
      
      if (operator === '+') {
        result += operand;
      } else if (operator === '-') {
        result -= operand;
      }
    }
    
    // 清空表达式，显示最终结果
    setExpression('');
    setAmount(result.toFixed(2));
  };

  // 处理删除键
  const handleDeletePress = () => {
    setAmount(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  // 获取最终要保存的金额（如果有未完成的表达式，先计算）
  const getFinalAmount = (): number => {
    // 如果有表达式，需要先计算完整结果
    if (expression) {
      const currentAmount = parseFloat(amount);
      const fullExpression = !isNaN(currentAmount) && currentAmount !== 0
        ? `${expression} ${amount}`
        : expression.trim().replace(/[+\-]\s*$/, '');
      
      const tokens = fullExpression.split(/\s+/);
      if (tokens.length > 0) {
        let result = parseFloat(tokens[0]);
        
        for (let i = 1; i < tokens.length; i += 2) {
          if (i + 1 >= tokens.length) break;
          
          const operator = tokens[i];
          const operand = parseFloat(tokens[i + 1]);
          
          if (isNaN(operand)) continue;
          
          if (operator === '+') {
            result += operand;
          } else if (operator === '-') {
            result -= operand;
          }
        }
        
        return isNaN(result) ? 0 : result;
      }
    }
    
    // 没有表达式，直接返回当前金额
    const finalAmount = parseFloat(amount);
    return isNaN(finalAmount) ? 0 : finalAmount;
  };

  // 获取交易日期（此处简化为当前时间）
  const getTransactionDate = (): Date => {
    return transactionDate;
  };

  // 保存附件（云端或本地）
  const saveAttachments = async (transactionId: number, attachmentsToSave: typeof attachments) => {
    if (attachmentsToSave.length === 0) return;

    setIsUploadingAttachments(true);
    
    try {
      if (storageType === 'cloud') {
        // 云端存储：上传到服务器
        for (const attachment of attachmentsToSave) {
          // 跳过已存在的附件
          if (attachment.isExisting) continue;
          
          const formData = new FormData();
          formData.append('file', {
            uri: attachment.uri,
            type: attachment.type || 'image/jpeg',
            name: attachment.fileName || 'image.jpg',
          } as any);

          await attachmentAPI.upload(transactionId, formData);
        }
      } else {
        // 本地存储：保存到设备文件系统
        for (const attachment of attachmentsToSave) {
          // 跳过已存在的附件
          if (attachment.isExisting) continue;
          
          await localAttachmentService.saveAttachment(
            transactionId,
            attachment.uri,
            attachment.fileName || 'image.jpg',
            attachment.type || 'image/jpeg',
            attachment.fileSize || 0
          );
        }
      }
    } catch (error) {
      console.error('保存附件失败:', error);
      toast.error(`部分附件${storageType === 'cloud' ? '上传' : '保存'}失败`);
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  // 快速保存（新增或更新）
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
        transactionDateTime: getTransactionDate().toISOString(),
        ledgerId: currentLedger?.id,
        paymentMethodId: selectedPaymentMethod?.id,
      };

      let transactionId: number;

      if (isEditMode && editingTransaction) {
        // 编辑模式：更新交易
        await transactionAPI.update(editingTransaction.id, transactionData);
        transactionId = editingTransaction.id;
        //toast.success('更新成功！');
      } else {
        // 新增模式：创建交易
        const result = await transactionAPI.create(transactionData as any);
        transactionId = result.id;
        //toast.success('记账成功！');
      }

      // 保存附件
      if (!isEditMode) {
        // 新增模式：保存所有附件（都是新的）
        if (attachments.length > 0) {
          await saveAttachments(transactionId, attachments);
        }
      } else {
        // 编辑模式：只保存未标记为已存在的附件
        const newAttachments = attachments.filter(att => !att.isExisting);
        if (newAttachments.length > 0) {
          await saveAttachments(transactionId, newAttachments);
        }
      }

      setTimeout(() => navigation.goBack(), 300);
    } catch (error) {
      console.error('保存交易失败:', error);
      toast.error(isEditMode ? '更新失败，请稍后重试' : '保存失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除交易
  const handleDelete = async () => {
    if (!isEditMode || !editingTransaction) return;

    try {
      setIsLoading(true);
      await transactionAPI.delete(editingTransaction.id);
      toast.success('删除成功');
      setTimeout(() => navigation.goBack(), 300);
    } catch (error) {
      console.error('删除交易失败:', error);
      toast.error('删除失败，请稍后重试');
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

      {/* ========== ✨ 新增：头部导航栏 ========== */}
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        
        <Text style={styles.headerTitle}>
          {isEditMode ? '编辑交易' : '新增交易'}
        </Text>
        
        {isEditMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isLoading}
          >
            <Icon name="trash" size={18} color={Colors.expense} />
          </TouchableOpacity>
        )}
        
        {!isEditMode && <View style={styles.headerPlaceholder} />}
      </View>

      {/* ========== 区域1: 金额 & 收支类型（固定在顶部） ========== */}
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
            <View style={styles.amountDisplay}>
              {/* 显示完整计算表达式（同一行） */}
              <View style={styles.expressionRow}>
                {expression ? (
                  <>
                    {/* 有表达式时的显示 */}
                    {amount !== '0' && parseFloat(amount) !== 0 ? (
                      <>
                        {/* 已输入第二个数字：5 + 5 = ¥10 */}
                        <Text style={styles.expressionText} numberOfLines={1}>
                          {expression} {amount} = 
                        </Text>
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
                      </>
                    ) : (
                      <>
                        {/* 未输入第二个数字：5 + */}
                        <Text style={styles.expressionText} numberOfLines={1}>
                          {expression}
                        </Text>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* 无表达式：¥5 */}
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
                      {amount}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ========== 区域2: 详情列表（可滚动） ========== */}
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
        {/* ========== 详情列表 ========== */}
        <View style={styles.detailsSection}>
          {/* 分类 */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => setShowCategoryPicker(true)}
          >
            <View style={styles.detailRowLeft}>
              {selectedCategory?.icon ? (
                <CategoryIcon icon={selectedCategory.icon} size={22} color={Colors.text} style={{width: 24, textAlign: 'center'}} />
              ) : (
                <Icon name="pricetag" size={22} color={Colors.primary} style={{width: 24, textAlign: 'center'}} />
              )}
              <Text style={styles.detailLabel}>分类</Text>
            </View>
            <View style={styles.detailRowRight}>
              <Text style={styles.detailValue}>
                {selectedCategory?.name || '请选择'}
              </Text>
              <Text style={styles.detailArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* 常用分类快捷选择 */}
          {(transactionType === 'EXPENSE' ? frequentExpenseCategories : frequentIncomeCategories).length > 0 && (
            <View style={styles.frequentCategoriesRow}>
              <View style={styles.frequentCategoriesLabel}>
                <Icon name="star" size={14} color={Colors.accent.yellow} />
                <Text style={styles.frequentCategoriesLabelText}>常用</Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.frequentCategoriesScroll}
              >
                {(transactionType === 'EXPENSE' ? frequentExpenseCategories : frequentIncomeCategories).map(category => {
                  const isActive = selectedCategory?.id === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.frequentCategoryChip,
                        isActive && styles.frequentCategoryChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                      activeOpacity={0.7}
                    >
                      <CategoryIcon icon={category.icon} size={16} color={isActive ? Colors.primary : Colors.textSecondary} />
                      <Text
                        style={[
                          styles.frequentCategoryChipText,
                          isActive && styles.frequentCategoryChipTextActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                      {category.isRecommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedBadgeText}>荐</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 账本 */}
          {ledgers.length > 1 && (
            <View style={styles.detailRow}>
              <LedgerSelector
                mode="flat"
                ledgers={ledgers}
                currentLedger={currentLedger}
                onSelect={ledger => {
                  if (ledger) setCurrentLedger(ledger);
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
              <Icon name="calendar" size={22} color={Colors.primary} style={{width: 24, textAlign: 'center'}} />
              <Text style={styles.detailLabel}>日期</Text>
            </View>
            <View style={styles.detailRowRight}>
              <Text style={styles.detailValue}>
                {formatDate(getTransactionDate())}
              </Text>
              <Text style={styles.detailArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* 账户 */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={handlePaymentMethodClick}
          >
            <View style={styles.detailRowLeft}>
              {selectedPaymentMethod ? (
                <PaymentIcon 
                  type={selectedPaymentMethod.type}
                  iconName={selectedPaymentMethod.icon}
                  size={22}
                  style={{width: 24, textAlign: 'center'}}
                />
              ) : (
                <Icon name="card" size={22} color={Colors.primary} style={{width: 24, textAlign: 'center'}} />
              )}
              <Text style={styles.detailLabel}>账户</Text>
            </View>
            <View style={styles.detailRowRight}>
              <Text style={[
                styles.detailValue,
                !selectedPaymentMethod && styles.detailValuePlaceholder
              ]}>
                {selectedPaymentMethod?.name || '请选择'}
              </Text>
              <Text style={styles.detailArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Line 599 omitted */}
          <View style={styles.descriptionRow}>
            <Icon name="create" size={22} color={Colors.primary} style={{width: 24, textAlign: 'center'}} />
            <TextInput
              style={styles.descriptionInput}
              placeholder="添加备注..."
              placeholderTextColor={Colors.textLight}
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* ========== 区域2.5: 图片附件 ========== */}
        <View style={styles.attachmentSection}>
          <CollapsibleSection
            title="附件"
            icon="paperclip"
            defaultCollapsed={true}
            badge={attachments.length}
          >
            <ImageAttachmentPicker
              images={attachments}
              onImagesChange={setAttachments}
              maxImages={9}
              maxSizeInMB={5}
              storageType={storageType}
              onStorageTypeChange={setStorageType}
              onImagePress={(index) => {
                // 点击图片打开全屏图库
                setGalleryInitialIndex(index);
                setShowGallery(true);
              }}
            />
          </CollapsibleSection>
        </View>
      </KeyboardAwareScrollView>

      {/* ========== 底部固定区域：数字键盘 + 保存按钮 ========== */}
      <View
        style={[
          styles.bottomFixedArea,
          { paddingBottom: Math.max(insets.bottom, Spacing.sm) },
        ]}
      >
        {/* 数字键盘 */}
        <View style={styles.keypadSection}>
          <NumberKeypad
            onNumberPress={handleNumberPress}
            onDeletePress={handleDeletePress}
            onOperatorPress={handleOperatorPress}
            onEquals={handleEquals}
          />
        </View>

        {/* 保存按钮 */}
        <View style={styles.saveButtonContainer}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {/* 追加按钮 - 仅在新增模式下显示 */}
            {!isEditMode && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary },
                  (isLoading || isUploadingAttachments) && styles.saveButtonDisabled,
                ]}
                onPress={() => {
                  // 验证金额
                  const numAmount = parseFloat(amount);
                  if (isNaN(numAmount) || numAmount <= 0) {
                    toast.info('请输入有效金额');
                    return;
                  }
                  
                  // 验证分类
                  if (!selectedCategory) {
                    toast.info('请选择分类');
                    return;
                  }

                  // 导航回列表页并打开追加弹窗
                  // 传递当前输入的金额和分类信息
                  console.log('🚀 点击追加按钮，准备导航...');
                  
                  // 直接使用 navigation 导航到 MainTabs
                  // AddTransactionScreen 是 MainStack 的直接子页面，MainTabs 也是
                  // 所以可以直接导航到 MainTabs
                  try {
                    navigation.navigate('MainTabs', {
                      screen: 'TransactionList',
                      params: {
                        action: 'append',
                        appendData: {
                          amount: numAmount,
                          categoryId: selectedCategory.id,
                          description: description,
                          transactionDateTime: transactionDate.toISOString()
                        }
                      }
                    });
                    console.log('✅ 导航命令已发送');
                  } catch (error) {
                    console.error('❌ 导航失败:', error);
                    // 备用方案：尝试 getParent
                    const parent = navigation.getParent();
                    if (parent) {
                        console.log('🔄 尝试使用父级导航器');
                        parent.navigate('MainTabs', {
                            screen: 'TransactionList',
                            params: {
                                action: 'append',
                                appendData: {
                                    amount: numAmount,
                                    categoryId: selectedCategory.id,
                                    description: description,
                                    transactionDateTime: transactionDate.toISOString()
                                }
                            }
                        });
                    } else {
                        console.error('❌ 备用方案也失败：未找到父级导航器');
                    }
                  }
                }}
                activeOpacity={0.8}
                disabled={isLoading || isUploadingAttachments}
              >
                <Text style={[styles.saveButtonText, { color: Colors.primary }]}>
                  追加到...
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.saveButton,
                { flex: 2 },
                transactionType === 'EXPENSE'
                  ? styles.saveButtonExpense
                  : styles.saveButtonIncome,
                (isLoading || isUploadingAttachments) && styles.saveButtonDisabled,
              ]}
              onPress={handleQuickSave}
              activeOpacity={0.8}
              disabled={isLoading || isUploadingAttachments}
            >
              {(isLoading || isUploadingAttachments) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color={Colors.surface} />
                  {isUploadingAttachments && (
                    <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>
                      上传附件中...
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditMode ? '保存' : '完成'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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

      {/* ========== 账户选择器 Modal ========== */}
      <PaymentMethodPicker
        visible={showPaymentMethodPicker}
        paymentMethods={paymentMethods}
        currentPaymentMethod={selectedPaymentMethod}
        onSelect={paymentMethod => {
          setSelectedPaymentMethod(paymentMethod);
          setShowPaymentMethodPicker(false);
        }}
        onClose={() => setShowPaymentMethodPicker(false)}
        title="选择账户"
      />

      {/* ========== 附件图库（仅用于全屏查看） ========== */}
      {loadedAttachments.length > 0 && (
        <AttachmentGallery
          attachments={loadedAttachments}
          editable={true}
          hideThumbnails={true}
          externalSelectedIndex={showGallery ? galleryInitialIndex : null}
          onCloseFullscreen={() => setShowGallery(false)}
          onDelete={async (attachmentId) => {
            try {
              // 从 loadedAttachments 中找到要删除的附件
              const attachment = loadedAttachments.find(att => att.id === attachmentId);
              if (!attachment) return;

              if (attachment.storageType === 'local') {
                await localAttachmentService.deleteAttachment(
                  editingTransaction!.id,
                  attachmentId as string
                );
              } else {
                await attachmentAPI.delete(attachmentId as number);
              }
              
              // 重新加载附件列表
              const localAtts = await localAttachmentService.getAttachments(editingTransaction!.id);
              if (localAtts.length > 0) {
                const imageAtts = localAtts.map(att => ({
                  uri: localAttachmentService.getFileUri(att.localPath),
                  fileName: att.fileName,
                  type: att.fileType,
                  fileSize: att.fileSize,
                  isExisting: true, // 标记为已存在
                }));
                setAttachments(imageAtts);
                setInitialAttachmentCount(localAtts.length);
                const unified: UnifiedAttachment[] = localAtts.map(att => ({
                  ...att,
                  storageType: 'local' as const,
                }));
                setLoadedAttachments(unified);
              } else {
                const cloudAtts = await attachmentAPI.list(editingTransaction!.id);
                if (cloudAtts.length > 0) {
                  const imageAtts = cloudAtts.map(att => ({
                    uri: attachmentAPI.getThumbnailUrl(att.id),
                    fileName: att.fileName,
                    type: att.fileType,
                    fileSize: att.fileSize,
                    isExisting: true, // 标记为已存在
                  }));
                  setAttachments(imageAtts);
                  setInitialAttachmentCount(cloudAtts.length);
                  setLoadedAttachments(cloudAtts);
                } else {
                  // 所有附件都删除了
                  setAttachments([]);
                  setInitialAttachmentCount(0);
                  setLoadedAttachments([]);
                  setShowGallery(false);
                }
              }
            } catch (error) {
              console.error('删除附件失败:', error);
              Alert.alert('错误', '删除附件失败');
            }
          }}
        />
      )}
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerPlaceholder: {
    width: 32,
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
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  contentContainer: {
    flexGrow: 1,
  },

  // ========== 金额区域（固定在顶部） ==========
  amountSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    alignSelf: 'center',
    marginBottom: Spacing.md,
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
    paddingVertical: Spacing.xs,
    minHeight: 56,
  },
  amountDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  expressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  expressionText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
    fontWeight: FontWeights.regular,
  },
  currentAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: FontSizes.xxxl,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
    fontWeight: FontWeights.medium,
  },
  amountText: {
    fontSize: 48,
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
    paddingVertical: Spacing.sm,
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
  detailValuePlaceholder: {
    color: Colors.textLight,
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

  // ========== 常用分类区域 ==========
  frequentCategoriesRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  frequentCategoriesLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  frequentCategoriesLabelText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  frequentCategoriesScroll: {
    paddingRight: Spacing.md,
  },
  frequentCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  frequentCategoryChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  frequentCategoryChipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  frequentCategoryChipTextActive: {
    color: Colors.primary,
  },
  recommendedBadge: {
    backgroundColor: Colors.accent.orange,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  recommendedBadgeText: {
    fontSize: 10,
    color: Colors.surface,
    fontWeight: FontWeights.bold,
  },

  // ========== 附件区域 ==========
  attachmentSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xs,
    ...Shadows.md,
  },

  // ========== 键盘区域 ==========
  keypadSection: {
    paddingTop: Spacing.xs,
  },

  // ========== 底部固定区域 ==========
  bottomFixedArea: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.lg,
  },
  saveButtonContainer: {
    paddingTop: Spacing.xs,
  },
  saveButton: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
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
