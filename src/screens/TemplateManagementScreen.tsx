/**
 * 交易模板管理页面
 * 管理用户的交易模板（查看、添加、编辑、删除、排序）
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { useTemplate } from '../context/TemplateContext';
import { useCategories } from '../context/CategoryContext';
import { usePaymentMethod } from '../context/PaymentMethodContext';
import { useLedger } from '../context/LedgerContext';
import { toast, showConfirm } from '../utils/toast';
import { templateAPI } from '../api/services';
import { Icon, AppIcons } from '../components/common';
import { CategoryIcon } from '../components/common/CategoryIcon';
import type { TransactionTemplate } from '../types/template';
import type { TransactionType } from '../types/transaction';

export const TemplateManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { templates, refreshTemplates, refreshQuickPanelTemplates } = useTemplate();
  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethod();
  const { ledgers } = useLedger();

  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TransactionTemplate | null>(null);

  // 表单状态
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<TransactionType>('EXPENSE');
  const [editCategoryId, setEditCategoryId] = useState<number | undefined>();
  const [editPaymentMethodId, setEditPaymentMethodId] = useState<number | undefined>();
  const [editLedgerId, setEditLedgerId] = useState<number | undefined>();
  const [editDescription, setEditDescription] = useState('');
  const [editAllowAmountEdit, setEditAllowAmountEdit] = useState(true);
  const [editShowInQuickPanel, setEditShowInQuickPanel] = useState(false);

  // 打开编辑/新增模态框
  const handleEdit = (template?: TransactionTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setEditName(template.name);
      setEditAmount(template.amount.toString());
      
      // 兼容处理后端可能返回数字类型的情况 (1: INCOME, 2: EXPENSE)
      const typeVal = template.type as unknown;
      if (typeVal === 2 || typeVal === 'EXPENSE') {
        setEditType('EXPENSE');
      } else {
        setEditType('INCOME');
      }

      setEditCategoryId(template.categoryId);
      setEditPaymentMethodId(template.paymentMethodId);
      setEditLedgerId(template.ledgerId);
      setEditDescription(template.description || '');
      setEditAllowAmountEdit(template.allowAmountEdit);
      setEditShowInQuickPanel(template.showInQuickPanel);
    } else {
      setEditingTemplate(null);
      setEditName('');
      setEditAmount('');
      setEditType('EXPENSE');
      setEditCategoryId(undefined);
      setEditPaymentMethodId(undefined);
      setEditLedgerId(undefined);
      setEditDescription('');
      setEditAllowAmountEdit(true);
      setEditShowInQuickPanel(false);
    }
    setShowEditModal(true);
  };

  // 保存模板
  const handleSave = async () => {
    // 必填项校验
    if (!editName.trim()) {
      toast.info('请输入模板名称');
      return;
    }

    if (!editAmount.trim()) {
      toast.info('请输入金额');
      return;
    }

    const amount = parseFloat(editAmount);
    if (isNaN(amount)) {
      toast.info('请输入有效的数字金额');
      return;
    }

    if (amount <= 0) {
      toast.info('金额必须大于0');
      return;
    }

    // 可选：限制最大金额
    if (amount > 999999.99) {
      toast.info('金额不能超过999999.99');
      return;
    }

    try {
      setIsLoading(true);
      const data = {
        name: editName.trim(),
        amount,
        type: editType === 'EXPENSE' ? 2 : 1,
        categoryId: editCategoryId,
        paymentMethodId: editPaymentMethodId,
        ledgerId: editLedgerId,
        description: editDescription.trim() || undefined,
        allowAmountEdit: editAllowAmountEdit,
        showInQuickPanel: editShowInQuickPanel,
      };

      if (editingTemplate) {
        await templateAPI.update(editingTemplate.id, data);
        toast.success('更新成功');
      } else {
        await templateAPI.create(data);
        toast.success('添加成功');
      }

      await refreshTemplates();
      await refreshQuickPanelTemplates();
      setShowEditModal(false);
    } catch (error: any) {
      console.error('保存模板失败:', error);
      const errorMsg = error.response?.data?.msg || '保存失败';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除模板
  const handleDelete = (template: TransactionTemplate) => {
    showConfirm(
      '确认删除',
      `确定要删除模板"${template.name}"吗？`,
      async () => {
        try {
          setIsLoading(true);
          await templateAPI.delete(template.id);
          toast.success('删除成功');
          await refreshTemplates();
          await refreshQuickPanelTemplates();
        } catch (error) {
          console.error('删除模板失败:', error);
          toast.error('删除失败');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // 切换快捷面板显示
  const handleToggleQuickPanel = async (template: TransactionTemplate) => {
    try {
      setIsLoading(true);
      await templateAPI.update(template.id, {
        name: template.name,
        amount: template.amount,
        type: template.type === 'EXPENSE' ? 2 : 1,
        categoryId: template.categoryId,
        paymentMethodId: template.paymentMethodId,
        ledgerId: template.ledgerId,
        description: template.description,
        allowAmountEdit: template.allowAmountEdit,
        showInQuickPanel: !template.showInQuickPanel,
      });
      await refreshTemplates();
      await refreshQuickPanelTemplates();
    } catch (error) {
      console.error('切换快捷面板失败:', error);
      toast.error('操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取分类信息
  const getCategoryInfo = (categoryId?: number) => {
    if (!categoryId) return { icon: '', name: '未设置' };
    const category = categories.find(c => c.id === categoryId);
    return category ? { icon: category.icon, name: category.name } : { icon: '', name: '未知分类' };
  };

  // 获取支付方式名称
  const getPaymentMethodName = (paymentMethodId?: number) => {
    if (!paymentMethodId) return '未设置';
    const method = paymentMethods.find(m => m.id === paymentMethodId);
    return method ? `${method.icon} ${method.name}` : '未知支付方式';
  };

  // 获取账本名称
  const getLedgerName = (ledgerId?: number) => {
    if (!ledgerId) return '未设置';
    const ledger = ledgers.find(l => l.id === ledgerId);
    return ledger ? ledger.name : '未知账本';
  };

  // 筛选分类（根据类型）
  const filteredCategories = categories.filter(c => c.type === editType);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 标题栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={AppIcons.arrowBack} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>交易模板</Text>
        <TouchableOpacity onPress={() => handleEdit()} style={styles.addButton}>
          <Icon name={AppIcons.add} size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 模板列表 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {templates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name={AppIcons.listOutline} size={64} color={Colors.textLight} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>暂无模板</Text>
            <Text style={styles.emptyHint}>点击右上角 + 创建模板</Text>
          </View>
        ) : (
          templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={styles.templateHeaderLeft}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  {template.showInQuickPanel && (
                    <View style={styles.quickBadge}>
                      <Icon name={AppIcons.star} size={10} color={Colors.primary} />
                      <Text style={styles.quickBadgeText}>快捷</Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.templateAmount,
                  template.type === 'EXPENSE' ? styles.amountExpense : styles.amountIncome
                ]}>
                  {template.type === 'EXPENSE' ? '-' : '+'}¥{template.amount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.templateDetails}>
                <View style={styles.detailRow}>
                  {template.categoryId ? (
                    <>
                      <CategoryIcon 
                        icon={getCategoryInfo(template.categoryId).icon} 
                        size={14} 
                        color={Colors.textSecondary} 
                      />
                      <Text style={styles.detailText}>{getCategoryInfo(template.categoryId).name}</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="pricetag-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>未设置</Text>
                    </>
                  )}
                </View>
                {template.paymentMethodId && (
                  <View style={styles.detailRow}>
                    <Icon name={AppIcons.cardOutline} size={14} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>{getPaymentMethodName(template.paymentMethodId)}</Text>
                  </View>
                )}
                {template.ledgerId && (
                  <View style={styles.detailRow}>
                    <Icon name={AppIcons.book} size={14} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>{getLedgerName(template.ledgerId)}</Text>
                  </View>
                )}
                {template.description && (
                  <View style={styles.detailRow}>
                    <Icon name={AppIcons.informationCircle} size={14} color={Colors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={1}>{template.description}</Text>
                  </View>
                )}
              </View>

              <View style={styles.templateActions}>
                <TouchableOpacity
                  onPress={() => handleToggleQuickPanel(template)}
                  style={styles.actionButton}
                  disabled={isLoading}
                >
                  <Icon 
                    name={template.showInQuickPanel ? AppIcons.star : AppIcons.starOutline} 
                    size={20} 
                    color={template.showInQuickPanel ? Colors.primary : Colors.textSecondary} 
                  />
                  <Text style={[
                    styles.actionButtonText,
                    template.showInQuickPanel && styles.actionButtonTextActive
                  ]}>
                    {template.showInQuickPanel ? '取消快捷' : '加入快捷'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleEdit(template)}
                  style={styles.actionButton}
                  disabled={isLoading}
                >
                  <Icon name={AppIcons.createOutline} size={20} color={Colors.textSecondary} />
                  <Text style={styles.actionButtonText}>编辑</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(template)}
                  style={styles.actionButton}
                  disabled={isLoading}
                >
                  <Icon name={AppIcons.trashOutline} size={20} color={Colors.error} />
                  <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 编辑/新增模态框 */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowEditModal(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTemplate ? '编辑模板' : '新增模板'}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCloseButton}>
                <Icon name={AppIcons.close} size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* 模板名称 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>模板名称 *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="如：地铁通勤、午餐"
                  placeholderTextColor={Colors.textLight}
                />
              </View>

              {/* 交易类型 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>交易类型 *</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeButton, editType === 'EXPENSE' && styles.typeButtonActive]}
                    onPress={() => setEditType('EXPENSE')}
                  >
                    <Text style={[styles.typeButtonText, editType === 'EXPENSE' && styles.typeButtonTextActive]}>
                      支出
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, editType === 'INCOME' && styles.typeButtonActive]}
                    onPress={() => setEditType('INCOME')}
                  >
                    <Text style={[styles.typeButtonText, editType === 'INCOME' && styles.typeButtonTextActive]}>
                      收入
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 金额 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>默认金额 *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* 分类 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>分类</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[styles.categoryItem, !editCategoryId && styles.categoryItemActive]}
                    onPress={() => setEditCategoryId(undefined)}
                  >
                    <Text style={styles.categoryItemText}>不设置</Text>
                  </TouchableOpacity>
                  {filteredCategories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryItem, editCategoryId === category.id && styles.categoryItemActive]}
                      onPress={() => setEditCategoryId(category.id)}
                    >
                      <CategoryIcon icon={category.icon} size={16} color={Colors.text} />
                      <Text style={styles.categoryItemText}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 支付方式 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>支付方式</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[styles.categoryItem, !editPaymentMethodId && styles.categoryItemActive]}
                    onPress={() => setEditPaymentMethodId(undefined)}
                  >
                    <Text style={styles.categoryItemText}>不设置</Text>
                  </TouchableOpacity>
                  {paymentMethods.map(method => (
                    <TouchableOpacity
                      key={method.id}
                      style={[styles.categoryItem, editPaymentMethodId === method.id && styles.categoryItemActive]}
                      onPress={() => setEditPaymentMethodId(method.id)}
                    >
                      <CategoryIcon icon={method.icon} size={16} color={Colors.text} />
                      <Text style={styles.categoryItemText}>{method.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 账本 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>默认账本</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[styles.categoryItem, !editLedgerId && styles.categoryItemActive]}
                    onPress={() => setEditLedgerId(undefined)}
                  >
                    <Text style={styles.categoryItemText}>不设置</Text>
                  </TouchableOpacity>
                  {ledgers.map(ledger => (
                    <TouchableOpacity
                      key={ledger.id}
                      style={[styles.categoryItem, editLedgerId === ledger.id && styles.categoryItemActive]}
                      onPress={() => setEditLedgerId(ledger.id)}
                    >
                      <Text style={styles.categoryItemText}>{ledger.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 描述 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>描述</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="备注信息（可选）"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* 选项 */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>使用时允许修改金额</Text>
                  <Switch
                    value={editAllowAmountEdit}
                    onValueChange={setEditAllowAmountEdit}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={editAllowAmountEdit ? Colors.primary : Colors.surface}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>显示在快捷面板</Text>
                    <Text style={styles.formHint}>在记账列表页快速访问</Text>
                  </View>
                  <Switch
                    value={editShowInQuickPanel}
                    onValueChange={setEditShowInQuickPanel}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={editShowInQuickPanel ? Colors.primary : Colors.surface}
                  />
                </View>
              </View>
            </ScrollView>

            {/* 保存按钮 */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 全局加载指示器 */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  addButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 3,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  templateCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  templateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  templateName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  quickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  quickBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  templateAmount: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  amountExpense: {
    color: Colors.expense,
  },
  amountIncome: {
    color: Colors.income,
  },
  templateDetails: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  templateActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  actionButtonTextActive: {
    color: Colors.primary,
  },
  actionButtonTextDanger: {
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    ...Shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalForm: {
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  formHint: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  formInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.surface,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
    gap: 4,
  },
  categoryItemActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  categoryItemIcon: {
    fontSize: 16,
  },
  categoryItemText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
