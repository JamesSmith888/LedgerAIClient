/**
 * 资金账户管理页面
 * 管理用户的资金账户（查看、添加、编辑、删除、设置默认）
 * 参考分类管理页面设计
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
  Platform,
  Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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
      toast.info('请输入账户名称');
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
        console.error('保存账户失败:', error);
      toast.error('保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除支付方式
  const handleDelete = (method: PaymentMethod) => {
    if (method.isDefault) {
      toast.info('默认账户不能删除');
      return;
    }

    showConfirm(
      '确认删除',
      `确定要删除账户"${method.name}"吗？`,
      async () => {
        try {
          setIsLoading(true);
          await paymentMethodAPI.delete(method.id);
          toast.success('删除成功');
          await refreshPaymentMethods();
        } catch (error) {
          console.error('删除账户失败:', error);
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
      console.error('初始化默认账户失败:', error);
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
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>资金账户管理</Text>
        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => handleEdit()}
        >
          <Icon name="add" size={24} color={Colors.primary} />
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
            />
            <Text style={styles.emptyText}>暂无账户</Text>
            <TouchableOpacity
              style={styles.initButton}
              onPress={handleInitDefaults}
              disabled={isLoading}
            >
              <Text style={styles.initButtonText}>
                {isLoading ? '初始化中...' : '初始化默认账户'}
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
                    activeOpacity={0.7}
                  >
                    <Icon name="create-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  {!method.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(method)}
                      activeOpacity={0.7}
                    >
                      <Icon name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 编辑/新增全屏页面 */}
      <Modal
        visible={showEditModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowEditModal(false);
        }}
      >
        <View
          style={[styles.fullScreenContainer, { paddingTop: insets.top }]}
        >
          {/* 页面头部 */}
          <View style={styles.editHeader}>
            <TouchableOpacity
              style={styles.editBackButton}
              onPress={() => setShowEditModal(false)}
            >
              <Icon name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.editHeaderTitle}>
              {editingMethod ? '编辑账户' : '新增账户'}
            </Text>
            <View style={styles.editHeaderRight} />
          </View>

          {/* 表单内容 */}
          <KeyboardAwareScrollView
            style={styles.editScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.editScrollViewContent}
            bottomOffset={20}
          >
            {/* 名称输入 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>名称 *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="请输入账户名称"
                placeholderTextColor={Colors.textLight}
                value={editName}
                onChangeText={setEditName}
                maxLength={50}
              />
            </View>

            {/* 图标选择 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>选择图标 *</Text>
              <View style={styles.iconGrid}>
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
                    activeOpacity={0.7}
                  >
                    <PaymentIcon 
                      type={item.type}
                      iconName={item.iconName} 
                      size={32}
                    />
                    <Text style={styles.iconOptionLabel}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </KeyboardAwareScrollView>

          {/* 底部按钮 */}
          <View style={[styles.editFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowEditModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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

  // 头部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
    zIndex: 10,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerAddButton: {
    padding: Spacing.xs,
    marginRight: -Spacing.xs,
  },

  // 列表
  scrollView: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  methodContent: {
    flex: 1,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.backgroundSecondary,
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
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  methodType: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  methodActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 空状态
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  initButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  initButtonText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: FontWeights.semibold,
  },

  // 全屏编辑模式
  fullScreenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  editBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editHeaderTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  editHeaderRight: {
    width: 40,
  },
  editScrollView: {
    flex: 1,
  },
  editScrollViewContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  editFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },

  // 表单
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  formInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // 图标选择
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 'auto',
    flex: 1,
    minWidth: 80,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: Spacing.md,
  },
  iconOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  iconOptionLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // 底部按钮
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },

  // 加载状态
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
