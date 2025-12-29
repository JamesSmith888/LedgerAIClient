/**
 * 分类管理页面
 * 管理交易分类（查看、添加、编辑、删除）
 * 参考 Telegram/Google 风格设计
 */
import React, { useState, useEffect, useCallback } from 'react';
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
  SectionList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { TransactionIcons } from '../constants/icons';
import { useCategories } from '../context/CategoryContext';
import { toast, showConfirm } from '../utils/toast';
import { categoryAPI } from '../api/services';
import { Icon } from '../components/common';
import { CategoryIcon } from '../components/common/CategoryIcon';
import type { Category } from '../types/transaction';

type TransactionType = 'EXPENSE' | 'INCOME';

// 图标选择器数据
const ICON_OPTIONS = [
  // 支出类图标
  { name: 'restaurant', icon: 'ionicons:restaurant', label: '餐饮' },
  { name: 'cart', icon: 'ionicons:cart', label: '购物' },
  { name: 'car', icon: 'ionicons:car', label: '交通' },
  { name: 'home', icon: 'ionicons:home', label: '日用' },
  { name: 'game-controller', icon: 'ionicons:game-controller', label: '娱乐' },
  { name: 'medical', icon: 'ionicons:medical', label: '医疗' },
  { name: 'book', icon: 'ionicons:book', label: '教育' },
  { name: 'phone-portrait', icon: 'ionicons:phone-portrait', label: '通讯' },
  { name: 'fitness', icon: 'ionicons:fitness', label: '运动' },
  { name: 'airplane', icon: 'ionicons:airplane', label: '旅游' },
  { name: 'heart', icon: 'ionicons:heart', label: '美容' },
  { name: 'paw', icon: 'ionicons:paw', label: '宠物' },
  { name: 'people', icon: 'ionicons:people', label: '社交' },
  { name: 'construct', icon: 'ionicons:construct', label: '维修' },
  { name: 'shield-checkmark', icon: 'ionicons:shield-checkmark', label: '保险' },
  { name: 'gift', icon: 'ionicons:gift', label: '礼物' },
  { name: 'flash', icon: 'ionicons:flash', label: '电费' },
  { name: 'water', icon: 'ionicons:water', label: '水费' },
  { name: 'flame', icon: 'ionicons:flame', label: '煤气' },
  { name: 'key', icon: 'ionicons:key', label: '房租' },
  { name: 'building', icon: 'ionicons:building', label: '物业' },
  { name: 'shirt', icon: 'ionicons:shirt', label: '衣服' },
  { name: 'shoe-prints', icon: 'ionicons:shoe-prints', label: '鞋子' },
  { name: 'sparkles', icon: 'ionicons:sparkles', label: '装饰' },
  { name: 'laptop', icon: 'ionicons:laptop', label: '电脑' },
  { name: 'camera', icon: 'ionicons:camera', label: '相机' },
  { name: 'musical-notes', icon: 'ionicons:musical-notes', label: '音乐' },
  { name: 'film', icon: 'ionicons:film', label: '电影' },
  { name: 'dumbbell', icon: 'ionicons:dumbbell', label: '健身' },
  { name: 'body', icon: 'ionicons:body', label: '瑜伽' },
  { name: 'glasses', icon: 'ionicons:glasses', label: '眼镜' },
  { name: 'happy', icon: 'ionicons:happy', label: '牙医' },
  { name: 'flask', icon: 'ionicons:flask', label: '药费' },
  { name: 'search', icon: 'ionicons:search', label: '检查' },
  { name: 'school', icon: 'ionicons:school', label: '教育' },
  { name: 'document', icon: 'ionicons:document', label: '文件' },
  { name: 'wifi', icon: 'ionicons:wifi', label: '网络' },
  { name: 'television', icon: 'ionicons:television', label: '电视' },
  { name: 'play-circle', icon: 'ionicons:play-circle', label: '媒体' },
  { name: 'coffee', icon: 'ionicons:coffee', label: '咖啡' },
  { name: 'ice-cream', icon: 'ionicons:ice-cream', label: '甜品' },
  { name: 'leaf', icon: 'ionicons:leaf', label: '叶子' },
  { name: 'moon', icon: 'ionicons:moon', label: '月亮' },
  { name: 'fast-food', icon: 'ionicons:fast-food', label: '快餐' },
  { name: 'storefront', icon: 'ionicons:storefront', label: '商店' },
  { name: 'basket', icon: 'ionicons:basket', label: '篮子' },
  { name: 'cube', icon: 'ionicons:cube', label: '盒子' },
  { name: 'wine', icon: 'ionicons:wine', label: '酒' },
  { name: 'train', icon: 'ionicons:train', label: '火车' },
  { name: 'subway', icon: 'ionicons:subway', label: '地铁' },
  { name: 'bus', icon: 'ionicons:bus', label: '公交' },
  { name: 'taxi', icon: 'ionicons:taxi', label: '打车' },
  { name: 'ticket', icon: 'ionicons:ticket', label: '门票' },
  { name: 'mountain', icon: 'ionicons:mountain', label: '山' },
  { name: 'bed', icon: 'ionicons:bed', label: '酒店' },
  { name: 'layers', icon: 'ionicons:layers', label: '层' },
  { name: 'mail', icon: 'ionicons:mail', label: '邮件' },
  { name: 'send', icon: 'ionicons:send', label: '发送' },
  // 收入类图标
  { name: 'wallet', icon: 'ionicons:wallet', label: '工资' },
  { name: 'trending-up', icon: 'ionicons:trending-up', label: '理财' },
  { name: 'briefcase', icon: 'ionicons:briefcase', label: '兼职' },
  { name: 'stats-chart', icon: 'ionicons:stats-chart', label: '投资' },
  { name: 'card', icon: 'ionicons:card', label: '红包' },
  { name: 'receipt', icon: 'ionicons:receipt', label: '报销' },
  { name: 'return-down-back', icon: 'ionicons:return-down-back', label: '退款' },
  { name: 'business', icon: 'ionicons:business', label: '租金' },
  { name: 'cash', icon: 'ionicons:cash', label: '分红' },
  { name: 'chatbubble', icon: 'ionicons:chatbubble', label: '咨询' },
  { name: 'hand-right', icon: 'ionicons:hand-right', label: '服务' },
  { name: 'person', icon: 'ionicons:person', label: '人物' },
  { name: 'microphone', icon: 'ionicons:microphone', label: '麦克风' },
  { name: 'mic', icon: 'ionicons:mic', label: '演讲' },
  { name: 'swap-horizontal', icon: 'ionicons:swap-horizontal', label: '转账' },
  { name: 'hand-left', icon: 'ionicons:hand-left', label: '借款' },
  { name: 'star', icon: 'ionicons:star', label: '星星' },
  { name: 'dice', icon: 'ionicons:dice', label: '彩票' },
  { name: 'fish', icon: 'ionicons:fish', label: '鱼' },
  { name: 'share-social', icon: 'ionicons:share-social', label: '分享' },
  { name: 'person-add', icon: 'ionicons:person-add', label: '添加人' },
  { name: 'local-offer', icon: 'ionicons:local-offer', label: '优惠' },
  { name: 'calendar', icon: 'ionicons:calendar', label: '日历' },
  { name: 'alert', icon: 'ionicons:alert', label: '警告' },
  { name: 'warning', icon: 'ionicons:warning', label: '警告' },
];

// 颜色选择器数据
const COLOR_OPTIONS = [
  '#FF9500', '#FF2D55', '#5AC8FA', '#34C759', '#AF52DE',
  '#FF3B30', '#007AFF', '#FFD60A', '#00C7BE', '#9C88FF',
  '#FF6B6B', '#4ECDC4', '#95E1D3', '#FFA07A', '#F38181',
  '#32ADE6', '#FFB347', '#9B59B6', '#95A5A6', '#3498DB',
  '#E74C3C', '#FF69B4',
];

export const CategoryManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { categories, expenseCategories, incomeCategories, refreshCategories, isLoading: categoriesLoading } = useCategories();

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('ionicons:restaurant');
  const [editColor, setEditColor] = useState('#FF9500');
  const [editType, setEditType] = useState<TransactionType>('EXPENSE');
  const [editDescription, setEditDescription] = useState('');
  
  // 图标和颜色选择器状态
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState<TransactionType>('EXPENSE');

  // 页面获得焦点时刷新分类数据
  useFocusEffect(
    useCallback(() => {
      console.log('[CategoryManagementScreen] 页面获得焦点，刷新分类数据');
      refreshCategories();
    }, [refreshCategories])
  );

  // 下拉刷新处理
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCategories();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCategories]);

  // 分离系统预设和自定义分类
  const systemExpenseCategories = expenseCategories.filter(c => c.id && c.isSystem !== false);
  const customExpenseCategories = expenseCategories.filter(c => c.id && c.isSystem === false);
  const systemIncomeCategories = incomeCategories.filter(c => c.id && c.isSystem !== false);
  const customIncomeCategories = incomeCategories.filter(c => c.id && c.isSystem === false);

  // 根据选中的标签页构建分组数据
  const sections = activeTab === 'EXPENSE' ?
    [
      { title: '系统预设', data: systemExpenseCategories, type: 'EXPENSE' as const, isSystem: true },
      { title: '我的自定义', data: customExpenseCategories, type: 'EXPENSE' as const, isSystem: false },
    ]
    :
    [
      { title: '系统预设', data: systemIncomeCategories, type: 'INCOME' as const, isSystem: true },
      { title: '我的自定义', data: customIncomeCategories, type: 'INCOME' as const, isSystem: false },
    ];

  // 打开编辑/新增屏幕
  const handleEdit = (category?: Category, type: TransactionType = 'EXPENSE') => {
    if (category) {
      // 编辑模式
      setEditingCategory(category);
      setEditName(category.name);
      setEditIcon(category.icon);
      setEditColor(category.color);
      setEditType(category.type);
      setEditDescription('');
    } else {
      // 新增模式
      setEditingCategory(null);
      setEditName('');
      setEditIcon(type === 'EXPENSE' ? 'ionicons:restaurant' : 'ionicons:wallet');
      setEditColor(type === 'EXPENSE' ? '#FF9500' : '#34C759');
      setEditType(type);
      setEditDescription('');
    }
    setShowEditModal(true);
  };

  // 保存分类
  const handleSave = async () => {
    if (!editName.trim()) {
      toast.info('请输入分类名称');
      return;
    }

    try {
      setIsLoading(true);
      if (editingCategory) {
        // 更新（仅自定义分类可更新）
        await categoryAPI.update(editingCategory.id, {
          name: editName.trim(),
          icon: editIcon,
          color: editColor,
          type: editType,
          description: editDescription.trim() || undefined,
        });
        toast.success('更新成功');
      } else {
        // 新增
        await categoryAPI.create({
          name: editName.trim(),
          icon: editIcon,
          color: editColor,
          type: editType,
          description: editDescription.trim() || undefined,
        });
        toast.success('添加成功');
      }
      await refreshCategories();
      setShowEditModal(false);
    } catch (error: any) {
      console.error('保存分类失败:', error);
      const errorMsg = error.response?.data?.msg || '保存失败';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除分类
  const handleDelete = (category: Category) => {
    // 系统预设分类不能删除
    if (category.isSystem) {
      toast.info('系统预设分类不能删除');
      return;
    }

    showConfirm(
      '确认删除',
      `确定要删除分类"${category.name}"吗？`,
      async () => {
        try {
          setIsLoading(true);
          await categoryAPI.delete(category.id);
          toast.success('删除成功');
          await refreshCategories();
        } catch (error: any) {
          console.error('删除分类失败:', error);
          const errorMsg = error.response?.data?.msg || '删除失败';
          toast.error(errorMsg);
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // 切换常用分类标记
  const handleToggleFrequent = async (category: Category) => {
    try {
      setIsLoading(true);
      if (category.isFrequent) {
        await categoryAPI.unmarkAsFrequent(category.id);
        toast.success('已取消常用标记');
      } else {
        await categoryAPI.markAsFrequent(category.id);
        toast.success('已标记为常用');
      }
      await refreshCategories();
    } catch (error: any) {
      console.error('切换常用标记失败:', error);
      const errorMsg = error.response?.data?.msg || '操作失败';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染分类卡片
  const renderCategoryCard = (category: Category, isSystem: boolean) => (
    <View key={category.id} style={styles.categoryCard}>
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '20' }]}>
          <CategoryIcon icon={category.icon} size={22} color={category.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.name}</Text>
          {isSystem && (
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeText}>系统预设</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.categoryActions}>
        {!isSystem && (
          <TouchableOpacity
            style={[styles.starButton, category.isFrequent && styles.starButtonActive]}
            onPress={() => handleToggleFrequent(category)}
            activeOpacity={0.7}
          >
            <Icon 
              name={category.isFrequent ? 'star' : 'star-outline'} 
              size={18} 
              color={category.isFrequent ? '#FFD60A' : Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        {!isSystem && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEdit(category)}
              activeOpacity={0.7}
            >
              <Icon name="create-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(category)}
              activeOpacity={0.7}
            >
              <Icon name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>分类管理</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 标签页导航 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'EXPENSE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('EXPENSE')}
          activeOpacity={0.7}
        >
          <Icon
            name={TransactionIcons.expense}
            size={20}
            color={activeTab === 'EXPENSE' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'EXPENSE' && styles.tabButtonTextActive,
            ]}
          >
            支出
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'INCOME' && styles.tabButtonActive]}
          onPress={() => setActiveTab('INCOME')}
          activeOpacity={0.7}
        >
          <Icon
            name={TransactionIcons.income}
            size={20}
            color={activeTab === 'INCOME' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'INCOME' && styles.tabButtonTextActive,
            ]}
          >
            收入
          </Text>
        </TouchableOpacity>
      </View>

      {/* 分类列表 */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {!section.isSystem && (
                <TouchableOpacity
                  style={styles.addSectionButton}
                  onPress={() => handleEdit(undefined, section.type)}
                  activeOpacity={0.7}
                >
                  <Icon name="add-circle" size={20} color={Colors.primary} />
                  <Text style={styles.addSectionButtonText}>添加</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.sectionContent}>
              {section.data.map(category => renderCategoryCard(category, section.isSystem))}
            </View>
          </View>
        ))}

        {/* 空状态 */}
        {categories.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="pricetag-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>暂无分类</Text>
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
              {editingCategory ? '编辑分类' : '新增分类'}
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
            {/* 分类名称 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>分类名称 *</Text>
              <TextInput
                style={styles.formInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="请输入分类名称"
                placeholderTextColor={Colors.textLight}
                maxLength={50}
              />
            </View>

            {/* 分类类型 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>分类类型 *</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    editType === 'EXPENSE' && styles.typeButtonActive,
                  ]}
                  onPress={() => setEditType('EXPENSE')}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={TransactionIcons.expense}
                    size={18}
                    color={editType === 'EXPENSE' ? Colors.surface : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      editType === 'EXPENSE' && styles.typeButtonTextActive,
                    ]}
                  >
                    支出
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    editType === 'INCOME' && styles.typeButtonActive,
                  ]}
                  onPress={() => setEditType('INCOME')}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={TransactionIcons.income}
                    size={18}
                    color={editType === 'INCOME' ? Colors.surface : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      editType === 'INCOME' && styles.typeButtonTextActive,
                    ]}
                  >
                    收入
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 图标选择 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>选择图标 *</Text>
              <TouchableOpacity
                style={styles.iconPreview}
                onPress={() => setShowIconPicker(!showIconPicker)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconPreviewContainer, { backgroundColor: editColor + '20' }]}>
                  <CategoryIcon icon={editIcon} size={32} color={editColor} />
                </View>
                <Icon name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              {showIconPicker && (
                <View style={styles.iconGrid}>
                  {ICON_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.name}
                      style={[
                        styles.iconOption,
                        editIcon === option.icon && styles.iconOptionSelected,
                      ]}
                      onPress={() => {
                        setEditIcon(option.icon);
                        setShowIconPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <CategoryIcon icon={option.icon} size={24} color={editColor} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 颜色选择 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>选择颜色 *</Text>
              <TouchableOpacity
                style={styles.colorPreview}
                onPress={() => setShowColorPicker(!showColorPicker)}
                activeOpacity={0.7}
              >
                <View style={[styles.colorPreviewBox, { backgroundColor: editColor }]} />
                <Text style={styles.colorPreviewText}>{editColor}</Text>
                <Icon name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>

              {showColorPicker && (
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        editColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        setEditColor(color);
                        setShowColorPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      {editColor === color && (
                        <Icon name="checkmark" size={16} color={Colors.surface} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 描述 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>描述（可选）</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="请输入分类描述"
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>
          </KeyboardAwareScrollView>

          {/* 底部按钮 */}
          <View style={[styles.editFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
            <TouchableOpacity
              style={[styles.cancelButton]}
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
  headerRight: {
    width: 40,
  },

  // 标签页导航
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },

  // 列表
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    // backgroundColor: Colors.surface, // Remove background to blend with list
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addSectionButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  sectionContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },

  // 分类卡片
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: FontSizes.md, // Increased font size
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  systemBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  systemBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  starButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButtonActive: {
    backgroundColor: '#FFD60A15',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginTop: Spacing.md,
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
  formContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
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
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // 类型选择器
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  typeButtonTextActive: {
    color: Colors.surface,
    fontWeight: FontWeights.semibold,
  },

  // 图标选择
  iconPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconPreviewContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: Colors.primary,
  },

  // 颜色选择
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorPreviewBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorPreviewText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: Colors.text,
    borderWidth: 3,
  },

  // 底部按钮
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
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
});
