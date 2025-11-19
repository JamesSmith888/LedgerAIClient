/**
 * 帮助与反馈页面
 * 用户可以查看自己提交的反馈记录，并提交新的反馈
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { toast, showConfirm } from '../utils/toast';
import { feedbackAPI, Feedback } from '../api/services/feedbackAPI';
import { Icon, FeatherIcons, AppIcons } from '../components/common';

// 反馈类型的颜色配置
const TYPE_COLORS = {
  '需求': Colors.primary,
  '优化': '#FF9500',
  'BUG': Colors.error,
};

// 反馈状态的颜色配置
const STATUS_COLORS = {
  '待处理': Colors.textSecondary,
  '处理中': '#FF9500',
  '已完成': Colors.success,
  '已关闭': Colors.textLight,
};

export const FeedbackScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<'全部' | '需求' | '优化' | 'BUG'>('全部');

  // 加载反馈列表
  const loadFeedbacks = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await feedbackAPI.getAll();
      setFeedbacks(data);
    } catch (error) {
      console.error('加载反馈失败:', error);
      toast.error('加载失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      loadFeedbacks();
    }, [])
  );

  // 下拉刷新
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFeedbacks(false);
  };

  // 删除反馈
  const handleDelete = (feedback: Feedback) => {
    showConfirm(
      '确认删除',
      `确定要删除反馈"${feedback.title}"吗？`,
      async () => {
        try {
          setIsLoading(true);
          await feedbackAPI.delete(feedback.id);
          toast.success('删除成功');
          await loadFeedbacks(false);
        } catch (error) {
          console.error('删除反馈失败:', error);
          toast.error('删除失败');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // 过滤反馈列表
  const filteredFeedbacks = selectedType === '全部' 
    ? feedbacks 
    : feedbacks.filter(f => f.type === selectedType);

  // 统计数量
  const counts = {
    '全部': feedbacks.length,
    '需求': feedbacks.filter(f => f.type === '需求').length,
    '优化': feedbacks.filter(f => f.type === '优化').length,
    'BUG': feedbacks.filter(f => f.type === 'BUG').length,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>帮助与反馈</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => (navigation as any).navigate('SubmitFeedback')}
        >
          <Icon type="ionicons" name={AppIcons.add} size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      {/* 类型筛选 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['全部', '需求', '优化', 'BUG'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                selectedType === type && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedType === type && styles.filterButtonTextActive,
                ]}
              >
                {type} ({counts[type]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 反馈列表 */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredFeedbacks.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <Icon
            type="feather"
            name={FeatherIcons.mail}
            size={64}
            color={Colors.textLight}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>暂无反馈记录</Text>
          <Text style={styles.emptyHint}>点击右上角"+"提交您的反馈</Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.listContainer}>
            {filteredFeedbacks.map(feedback => (
              <View key={feedback.id} style={styles.feedbackCard}>
                {/* 头部 */}
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackHeaderLeft}>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: TYPE_COLORS[feedback.type] + '15' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          { color: TYPE_COLORS[feedback.type] },
                        ]}
                      >
                        {feedback.type}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_COLORS[feedback.status] + '15' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: STATUS_COLORS[feedback.status] },
                        ]}
                      >
                        {feedback.status}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(feedback)}
                    style={styles.deleteButton}
                  >
                    <Icon
                      type="feather"
                      name={FeatherIcons.trash2}
                      size={18}
                      color={Colors.error}
                    />
                  </TouchableOpacity>
                </View>

                {/* 标题 */}
                <Text style={styles.feedbackTitle}>{feedback.title}</Text>

                {/* 描述 */}
                {feedback.description && (
                  <Text style={styles.feedbackDescription} numberOfLines={3}>
                    {feedback.description}
                  </Text>
                )}

                {/* 管理员回复 */}
                {feedback.adminReply && (
                  <View style={styles.replyContainer}>
                    <View style={styles.replyHeader}>
                      <Icon
                        type="feather"
                        name={FeatherIcons.mail}
                        size={14}
                        color={Colors.primary}
                      />
                      <Text style={styles.replyLabel}>管理员回复</Text>
                    </View>
                    <Text style={styles.replyText}>{feedback.adminReply}</Text>
                  </View>
                )}

                {/* 时间 */}
                <View style={styles.feedbackFooter}>
                  <Text style={styles.feedbackTime}>
                    提交于 {new Date(feedback.createTime).toLocaleDateString('zh-CN')}
                  </Text>
                  {feedback.updateTime !== feedback.createTime && (
                    <Text style={styles.feedbackTime}>
                      更新于 {new Date(feedback.updateTime).toLocaleDateString('zh-CN')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
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
  filterContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.background,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  filterButtonTextActive: {
    color: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
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
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: Spacing.md,
  },
  feedbackCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  feedbackHeaderLeft: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: FontWeights.semibold,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: FontWeights.medium,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  feedbackTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  feedbackDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  replyContainer: {
    backgroundColor: Colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  replyLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  replyText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  feedbackTime: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
  },
});
