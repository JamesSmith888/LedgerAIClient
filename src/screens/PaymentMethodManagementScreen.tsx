/**
 * 支付方式管理页面
 * 管理用户的支付方式（查看、添加、编辑、删除、设置默认）
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { usePaymentMethod } from '../context/PaymentMethodContext';
import { toast, showConfirm } from '../utils/toast';
import { paymentMethodAPI } from '../api/services';
import { Icon } from '../components/common';
import { PaymentIcon, PAYMENT_METHOD_CONFIGS } from '../components/payment/PaymentIcon';
import type { PaymentMethod, PaymentMethodType } from '../types/paymentMethod';

// 支付方式类型选项
const PAYMENT_METHOD_TYPES = PAYMENT_METHOD_CONFIGS;

export const PaymentMethodManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { paymentMethods, refreshPaymentMethods, setDefaultPaymentMethod } = usePaymentMethod();

  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editName, setEditName] = useState('');
  const [editIconName, setEditIconName] = useState('card');
  const [editType, setEditType] = useState<PaymentMethodType>('CASH');

  // 打开编辑/新增模态框
  const handleEdit = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setEditName(method.name);
      setEditIconName(method.icon);
      setEditType(method.type);
    } else {
      setEditingMethod(null);
      setEditName('');
      setEditIconName('💵'); // 默认现金 emoji
      setEditType('CASH');
    }
    setShowEditModal(true);
  };

  // 保存支付方式
  const handleSave = async () => {
    if (!editName.trim()) {
      toast.info('请输入支付方式名称');
      return;
    }

    try {
      setIsLoading(true);
      if (editingMethod) {
        // 更新
        await paymentMethodAPI.update(editingMethod.id, {
          name: editName.trim(),
          icon: editIconName,
          type: editType,
        });
        toast.success('更新成功');
      } else {
        // 新增
        await paymentMethodAPI.create({
          name: editName.trim(),
          icon: editIconName,
          type: editType,
        });
        toast.success('添加成功');
      }
      await refreshPaymentMethods();
      setShowEditModal(false);
    } catch (error) {
      console.error('保存支付方式失败:', error);
      toast.error('保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除支付方式
  const handleDelete = (method: PaymentMethod) => {
    if (method.isDefault) {
      toast.info('默认支付方式不能删除');
      return;
    }

    showConfirm(
      '确认删除',
      `确定要删除支付方式"${method.name}"吗？`,
      async () => {
        try {
          setIsLoading(true);
          await paymentMethodAPI.delete(method.id);
          toast.success('删除成功');
          await refreshPaymentMethods();
        } catch (error) {
          console.error('删除支付方式失败:', error);
          toast.error('删除失败');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // 设置默认
  const handleSetDefault = async (method: PaymentMethod) => {
    if (method.isDefault) return;

    try {
      setIsLoading(true);
      await setDefaultPaymentMethod(method.id);
      toast.success('已设置为默认');
    } catch (error) {
      console.error('设置默认失败:', error);
      toast.error('设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化默认支付方式
  const handleInitDefaults = async () => {
    try {
      setIsLoading(true);
      await paymentMethodAPI.initDefaults();
      toast.success('初始化成功');
      await refreshPaymentMethods();
    } catch (error: any) {
      console.error('初始化默认支付方式失败:', error);
      const errorMsg = error.response?.data?.msg || '初始化失败';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>支付方式管理</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => handleEdit()}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 支付方式列表 */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon 
              name="card-outline" 
              size={64} 
              color={Colors.textLight}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>暂无支付方式</Text>
            <Text style={styles.emptyHint}>点击下方按钮快速初始化</Text>
            <Text style={styles.emptyHintSecondary}>或点击右上角"+"手动添加</Text>
            <TouchableOpacity
              style={styles.initButton}
              onPress={handleInitDefaults}
              disabled={isLoading}
            >
              <Text style={styles.initButtonText}>
                {isLoading ? '初始化中...' : '初始化默认支付方式'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {paymentMethods.map(method => (
              <View key={method.id} style={styles.methodCard}>
                <TouchableOpacity
                  style={styles.methodContent}
                  onPress={() => handleSetDefault(method)}
                  activeOpacity={0.7}
                >
                  <View style={styles.methodLeft}>
                    <View
                      style={[
                        styles.methodIconContainer,
                        method.isDefault && styles.methodIconContainerDefault,
                      ]}
                    >
                      <PaymentIcon 
                        type={method.type}
                        iconName={method.icon}
                        size={28} 
                      />
                    </View>
                    <View style={styles.methodInfo}>
                      <View style={styles.methodNameRow}>
                        <Text style={styles.methodName}>{method.name}</Text>
                        {method.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>默认</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.methodType}>
                        {PAYMENT_METHOD_TYPES.find(t => t.type === method.type)?.name}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.methodActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(method)}
                  >
                    <Text style={styles.actionButtonText}>编辑</Text>
                  </TouchableOpacity>
                  {!method.isDefault && (
                    <>
                      <View style={styles.actionDivider} />
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(method)}
                      >
                        <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                          删除
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 编辑/新增模态框 */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {editingMethod ? '编辑支付方式' : '新增支付方式'}
            </Text>

            {/* 名称输入 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>名称</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入名称"
                placeholderTextColor={Colors.textLight}
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            {/* 图标选择 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>图标</Text>
              <View style={styles.iconSelector}>
                {PAYMENT_METHOD_TYPES.map(item => (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.iconOption,
                      editIconName === item.iconName && styles.iconOptionSelected,
                    ]}
                    onPress={() => {
                      setEditIconName(item.iconName);
                      setEditType(item.type);
                    }}
                  >
                    <PaymentIcon 
                      type={item.type}
                      iconName={item.iconName} 
                      size={24}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 按钮组 */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.surface} size="small" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 32,
    color: Colors.text,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    fontSize: 24,
    color: Colors.surface,
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
  },
  emptyHintSecondary: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
  initButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
    ...Shadows.md,
  },
  initButtonText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: FontWeights.semibold,
  },
  listContainer: {
    padding: Spacing.md,
  },
  methodCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  methodContent: {
    padding: Spacing.md,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  methodIconContainerDefault: {
    backgroundColor: Colors.primary + '15',
  },
  methodInfo: {
    flex: 1,
  },
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  methodName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  defaultBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  methodType: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  methodActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  actionButtonTextDanger: {
    color: Colors.expense,
  },
  actionDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },

  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.xs,
    fontWeight: FontWeights.medium,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.background,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  modalButtonTextConfirm: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: FontWeights.semibold,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
