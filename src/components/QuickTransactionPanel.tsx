/**
 * 快捷记账面板组件
 * 横向滚动展示常用模板，支持快速创建交易
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { Icon, AppIcons } from '../components/common';
import { CategoryIcon } from '../components/common/CategoryIcon';
import type { TransactionTemplate } from '../types/template';
import { templateAPI } from '../api/services';
import { toast } from '../utils/toast';
import { useCategories } from '../context/CategoryContext';

interface QuickTransactionPanelProps {
  templates: TransactionTemplate[];
  onTransactionCreated?: () => void;
}

export const QuickTransactionPanel: React.FC<QuickTransactionPanelProps> = ({
  templates,
  onTransactionCreated,
}) => {
  const { categories } = useCategories();
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TransactionTemplate | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 打开快速创建对话框
  const handleTemplatePress = (template: TransactionTemplate) => {
    setSelectedTemplate(template);
    setQuickAmount(template.amount.toString());
    
    // 如果不允许修改金额，直接创建
    if (!template.allowAmountEdit) {
      handleQuickCreate(template, template.amount);
    } else {
      setShowQuickCreateModal(true);
    }
  };

  // 快速创建交易
  const handleQuickCreate = async (template: TransactionTemplate, amount?: number) => {
    try {
      setIsCreating(true);
      const finalAmount = amount || (parseFloat(quickAmount) || template.amount);
      
      await templateAPI.quickCreateTransaction(template.id, {
        amount: finalAmount,
      });
      
      toast.success('记账成功');
      setShowQuickCreateModal(false);
      onTransactionCreated?.();
    } catch (error) {
      console.error('快速创建交易失败:', error);
      toast.error('创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 获取分类信息
  const getCategoryInfo = (categoryId?: number) => {
    if (!categoryId) return { icon: '📝', name: '未分类' };
    const category = categories.find(c => c.id === categoryId);
    return category ? { icon: category.icon, name: category.name } : { icon: '📝', name: '未知' };
  };

  // 判断是否为支出类型（兼容后端数字类型：1=INCOME, 2=EXPENSE）
  const isExpenseType = (type: any): boolean => {
    return type === 2 || type === 'EXPENSE';
  };

  if (templates.length === 0) {
    return null; // 没有快捷模板时不显示面板
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {templates.map((template) => {
            const categoryInfo = getCategoryInfo(template.categoryId);
            return (
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => handleTemplatePress(template)}
                activeOpacity={0.7}
              >
                <View style={styles.templateIcon}>
                  <CategoryIcon 
                    icon={categoryInfo.icon} 
                    size={20} 
                    color={Colors.primary} 
                  />
                </View>
                <Text style={styles.templateName} numberOfLines={1}>
                  {template.name}
                </Text>
                <Text style={[
                  styles.templateAmount,
                  isExpenseType(template.type) ? styles.amountExpense : styles.amountIncome
                ]}>
                  {isExpenseType(template.type) ? '-' : '+'}¥{template.amount.toFixed(0)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 快速创建对话框 */}
      <Modal
        visible={showQuickCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickCreateModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowQuickCreateModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedTemplate && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedTemplate.name}</Text>
                  <TouchableOpacity
                    onPress={() => setShowQuickCreateModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <Icon name={AppIcons.close} size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>金额</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={quickAmount}
                    onChangeText={setQuickAmount}
                    keyboardType="decimal-pad"
                    placeholder="输入金额"
                    placeholderTextColor={Colors.textLight}
                    autoFocus
                  />

                  {selectedTemplate.description && (
                    <View style={styles.descriptionContainer}>
                      <Icon name={AppIcons.informationCircle} size={14} color={Colors.textLight} />
                      <Text style={styles.descriptionText} numberOfLines={2}>
                        {selectedTemplate.description}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowQuickCreateModal(false)}
                    disabled={isCreating}
                  >
                    <Text style={styles.modalCancelText}>取消</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => selectedTemplate && handleQuickCreate(selectedTemplate)}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <ActivityIndicator color={Colors.surface} size="small" />
                    ) : (
                      <Text style={styles.modalConfirmText}>确认</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
    gap: Spacing.sm,
  },
  templateCard: {
    width: 72,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 6,
    alignItems: 'center',
    ...Shadows.sm,
  },
  templateIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 11,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: 0,
    textAlign: 'center',
  },
  templateAmount: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    marginTop: 1,
  },
  amountExpense: {
    color: Colors.expense,
  },
  amountIncome: {
    color: Colors.income,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 340,
    ...Shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    flex: 1,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  descriptionText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    flex: 1,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
});
