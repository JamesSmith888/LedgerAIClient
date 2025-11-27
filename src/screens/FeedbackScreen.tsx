/**
 * 帮助与反馈页面（GitHub Issues风格）
 * 用户可以查看所有用户提交的反馈，搜索、筛选、查看详情、评论等
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
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { toast, showConfirm } from '../utils/toast';
import { feedbackAPI, Feedback } from '../api/services/feedbackAPI';
import { Icon, FeatherIcons, AppIcons } from '../components/common';
import { useAuth } from '../context/AuthContext';

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

// 视图模式
type ViewMode = 'all' | 'mine';

export const FeedbackScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<'全部' | '需求' | '优化' | 'BUG'>('全部');
  const [selectedStatus, setSelectedStatus] = useState<'全部' | '待处理' | '处理中' | '已完成' | '已关闭'>('全部');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 加载反馈列表
  const loadFeedbacks = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      
      let data: Feedback[];
      
      // 根据视图模式加载不同的数据
      if (viewMode === 'mine') {
        data = await feedbackAPI.getAll(); // 我的反馈
      } else {
        data = await feedbackAPI.getAllPublic(); // 所有公开反馈
      }
      
      setFeedbacks(data);
    } catch (error) {
      console.error('加载反馈失败:', error);
      toast.error('加载失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 搜索反馈
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      loadFeedbacks();
      return;
    }

    try {
      setIsLoading(true);
      const data = await feedbackAPI.search(searchKeyword.trim());
      setFeedbacks(data);
    } catch (error) {
      console.error('搜索失败:', error);
      toast.error('搜索失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      loadFeedbacks();
    }, [viewMode])
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

  // 处理点赞/倒赞反馈
  const handleReactFeedback = async (feedback: Feedback, reactionType: 'upvote' | 'downvote') => {
    try {
      if (feedback.userReaction === reactionType) {
        // 取消反应
        await feedbackAPI.removeFeedbackReaction(feedback.id);
      } else if (reactionType === 'upvote') {
        await feedbackAPI.upvoteFeedback(feedback.id);
      } else {
        await feedbackAPI.downvoteFeedback(feedback.id);
      }
      
      // 更新本地状态
      const updatedFeedbacks = feedbacks.map(f => {
        if (f.id === feedback.id) {
          let updatedFeedback = { ...f };
          
          // 如果取消反应
          if (f.userReaction === reactionType) {
            if (reactionType === 'upvote') {
              updatedFeedback.upvoteCount = Math.max(0, (f.upvoteCount || 0) - 1);
            } else {
              updatedFeedback.downvoteCount = Math.max(0, (f.downvoteCount || 0) - 1);
            }
            updatedFeedback.userReaction = null;
          } else {
            // 更新新反应
            if (f.userReaction === 'upvote') {
              updatedFeedback.upvoteCount = Math.max(0, (f.upvoteCount || 0) - 1);
            } else if (f.userReaction === 'downvote') {
              updatedFeedback.downvoteCount = Math.max(0, (f.downvoteCount || 0) - 1);
            }
            
            if (reactionType === 'upvote') {
              updatedFeedback.upvoteCount = (f.upvoteCount || 0) + 1;
            } else {
              updatedFeedback.downvoteCount = (f.downvoteCount || 0) + 1;
            }
            updatedFeedback.userReaction = reactionType;
          }
          
          return updatedFeedback;
        }
        return f;
      });
      
      setFeedbacks(updatedFeedbacks);
    } catch (error) {
      console.error('反应失败:', error);
      toast.error('操作失败，请重试');
    }
  };

  // 过滤反馈列表
  const filteredFeedbacks = feedbacks.filter(f => {
    // 类型筛选
    if (selectedType !== '全部' && f.type !== selectedType) return false;
    // 状态筛选
    if (selectedStatus !== '全部' && f.status !== selectedStatus) return false;
    return true;
  });

  // 统计数量
  const typeCounts = {
    '全部': feedbacks.length,
    '需求': feedbacks.filter(f => f.type === '需求').length,
    '优化': feedbacks.filter(f => f.type === '优化').length,
    'BUG': feedbacks.filter(f => f.type === 'BUG').length,
  };

  const statusCounts = {
    '全部': feedbacks.length,
    '待处理': feedbacks.filter(f => f.status === '待处理').length,
    '处理中': feedbacks.filter(f => f.status === '处理中').length,
    '已完成': feedbacks.filter(f => f.status === '已完成').length,
    '已关闭': feedbacks.filter(f => f.status === '已关闭').length,
  };

  // 获取显示的用户名（优先显示昵称）
  const getDisplayName = (feedback: Feedback): string => {
    if (feedback.userNickname && feedback.userNickname.trim()) {
      return feedback.userNickname;
    }
    if (feedback.userName && feedback.userName.trim()) {
      return feedback.userName;
    }
    return `用户${feedback.userId}`;
  };

  // 跳转到反馈详情
  const navigateToDetail = (feedback: Feedback) => {
    (navigation as any).navigate('FeedbackDetail', { feedbackId: feedback.id });
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

      {/* 搜索栏 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon
            type="feather"
            name={FeatherIcons.search}
            size={18}
            color={Colors.textLight}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索反馈标题或描述..."
            placeholderTextColor={Colors.textLight}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchKeyword('');
                loadFeedbacks();
              }}
            >
              <Icon
                type="ionicons"
                name={AppIcons.closeCircle}
                size={18}
                color={Colors.textLight}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 视图模式切换 */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'all' && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode('all')}
        >
          <Icon
            type="ionicons"
            name={AppIcons.peopleOutline}
            size={18}
            color={viewMode === 'all' ? Colors.surface : Colors.textSecondary}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === 'all' && styles.viewModeButtonTextActive,
            ]}
          >
            全部反馈
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'mine' && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode('mine')}
        >
          <Icon
            type="ionicons"
            name={AppIcons.personOutline}
            size={18}
            color={viewMode === 'mine' ? Colors.surface : Colors.textSecondary}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === 'mine' && styles.viewModeButtonTextActive,
            ]}
          >
            我的反馈
          </Text>
        </TouchableOpacity>
      </View>

      {/* 类型筛选 */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>类型</Text>
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
                {type} ({typeCounts[type]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 状态筛选 */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>状态</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['全部', '待处理', '处理中', '已完成', '已关闭'] as const).map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === status && styles.filterButtonTextActive,
                ]}
              >
                {status} ({statusCounts[status]})
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
                <TouchableOpacity
                  style={styles.feedbackCardTouchable}
                  onPress={() => navigateToDetail(feedback)}
                  activeOpacity={0.7}
                >
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
                      {/* 当状态筛选为"全部"时，显示状态标签 */}
                      {selectedStatus === '全部' && (
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
                      )}
                    </View>
                    {/* 只在有删除权限时显示删除按钮 */}
                    {feedback.canDelete && (
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
                    )}
                  </View>

                  {/* 标题 */}
                  <Text style={styles.feedbackTitle}>{feedback.title}</Text>

                  {/* 描述 */}
                  {feedback.description && (
                    <Text style={styles.feedbackDescription} numberOfLines={2}>
                      {feedback.description}
                    </Text>
                  )}

                  {/* 创建者和评论数 */}
                  <View style={styles.feedbackMeta}>
                    <View style={styles.feedbackMetaItem}>
                      <Icon
                        type="ionicons"
                        name={AppIcons.personOutline}
                        size={14}
                        color={Colors.textLight}
                      />
                      <Text style={styles.feedbackMetaText}>
                        {getDisplayName(feedback)}
                      </Text>
                    </View>
                    {feedback.commentCount != null && feedback.commentCount > 0 && (
                      <View style={styles.feedbackMetaItem}>
                        <Icon
                          type="feather"
                          name={FeatherIcons.messageSquare}
                          size={14}
                          color={Colors.textLight}
                        />
                        <Text style={styles.feedbackMetaText}>
                          {feedback.commentCount}
                        </Text>
                      </View>
                    )}
                  </View>

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
                </TouchableOpacity>

                {/* 点赞/倒赞栏 */}
                <View style={styles.reactionBar}>
                  <TouchableOpacity
                    style={[
                      styles.reactionButton,
                      feedback.userReaction === 'upvote' && styles.reactionButtonActive,
                    ]}
                    onPress={() => handleReactFeedback(feedback, 'upvote')}
                  >
                    <Icon
                      type="feather"
                      name={FeatherIcons.thumbsUp}
                      size={16}
                      color={feedback.userReaction === 'upvote' ? Colors.primary : Colors.textLight}
                    />
                    <Text
                      style={[
                        styles.reactionButtonText,
                        feedback.userReaction === 'upvote' && styles.reactionButtonTextActive,
                      ]}
                    >
                      {feedback.upvoteCount || 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.reactionButton,
                      feedback.userReaction === 'downvote' && styles.reactionButtonActive,
                    ]}
                    onPress={() => handleReactFeedback(feedback, 'downvote')}
                  >
                    <Icon
                      type="feather"
                      name={FeatherIcons.thumbsDown}
                      size={16}
                      color={feedback.userReaction === 'downvote' ? Colors.error : Colors.textLight}
                    />
                    <Text
                      style={[
                        styles.reactionButtonText,
                        feedback.userReaction === 'downvote' && styles.reactionButtonTextDownvote,
                      ]}
                    >
                      {feedback.downvoteCount || 0}
                    </Text>
                  </TouchableOpacity>
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
  searchContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    gap: Spacing.xs,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.primary,
  },
  viewModeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  viewModeButtonTextActive: {
    color: Colors.surface,
    fontWeight: FontWeights.semibold,
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
  filterLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
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
    padding: 0,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  feedbackCardTouchable: {
    padding: Spacing.md,
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
  feedbackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  feedbackMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackMetaText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
  },
  reactionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.lg,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },
  reactionButtonActive: {
    backgroundColor: Colors.primary + '15',
  },
  reactionButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    fontWeight: FontWeights.medium,
  },
  reactionButtonTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  reactionButtonTextDownvote: {
    color: Colors.error,
    fontWeight: FontWeights.semibold,
  },
});
