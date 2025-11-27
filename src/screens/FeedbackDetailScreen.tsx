/**
 * 反馈详情页面（GitHub Issue详情风格）
 * 展示反馈的完整信息、评论列表，支持添加评论、关闭/重新打开反馈
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { toast, showConfirm } from '../utils/toast';
import { feedbackAPI, Feedback, FeedbackComment } from '../api/services/feedbackAPI';
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

export const FeedbackDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const feedbackId = (route.params as any)?.feedbackId;

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentText, setCommentText] = useState('');

  // 加载反馈详情和评论
  const loadFeedbackDetail = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      
      const [feedbackData, commentsData] = await Promise.all([
        feedbackAPI.getById(feedbackId),
        feedbackAPI.getComments(feedbackId),
      ]);
      
      setFeedback(feedbackData);
      setComments(commentsData);
    } catch (error) {
      console.error('加载反馈详情失败:', error);
      toast.error('加载失败');
      navigation.goBack();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFeedbackDetail();
    }, [feedbackId])
  );

  // 下拉刷新
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFeedbackDetail(false);
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('请输入评论内容');
      return;
    }

    try {
      setIsSubmittingComment(true);
      await feedbackAPI.addComment(feedbackId, commentText.trim());
      setCommentText('');
      toast.success('评论成功');
      await loadFeedbackDetail(false);
    } catch (error) {
      console.error('评论失败:', error);
      toast.error('评论失败');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 关闭反馈
  const handleCloseFeedback = () => {
    showConfirm(
      '关闭反馈',
      '确定要关闭这个反馈吗？关闭后仍可重新打开。',
      async () => {
        try {
          setIsLoading(true);
          await feedbackAPI.close(feedbackId);
          toast.success('反馈已关闭');
          await loadFeedbackDetail(false);
        } catch (error) {
          console.error('关闭反馈失败:', error);
          toast.error('操作失败');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // 重新打开反馈
  const handleReopenFeedback = () => {
    showConfirm(
      '重新打开反馈',
      '确定要重新打开这个反馈吗？',
      async () => {
        try {
          setIsLoading(true);
          await feedbackAPI.reopen(feedbackId);
          toast.success('反馈已重新打开');
          await loadFeedbackDetail(false);
        } catch (error) {
          console.error('重新打开反馈失败:', error);
          toast.error('操作失败');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // 删除反馈
  const handleDeleteFeedback = () => {
    showConfirm(
      '确认删除',
      '确定要删除这个反馈吗？此操作不可恢复。',
      async () => {
        try {
          setIsLoading(true);
          await feedbackAPI.delete(feedbackId);
          toast.success('删除成功');
          navigation.goBack();
        } catch (error) {
          console.error('删除失败:', error);
          toast.error('删除失败');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // 获取显示的用户名（优先显示昵称）
  const getDisplayName = (userId: number, userName?: string, userNickname?: string): string => {
    if (userNickname && userNickname.trim()) {
      return userNickname;
    }
    if (userName && userName.trim()) {
      return userName;
    }
    return `用户${userId}`;
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>反馈详情</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!feedback) {
    return null;
  }

  const isCreator = feedback.userId === user?.id;
  const isClosed = feedback.status === '已关闭';
  const canClose = feedback.canClose || false; // 是否有关闭/重开权限

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{feedback.id}</Text>
        {canClose && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              if (isClosed) {
                handleReopenFeedback();
              } else {
                handleCloseFeedback();
              }
            }}
          >
            <Icon
              type="feather"
              name={isClosed ? 'rotate-cw' : 'x-circle'}
              size={20}
              color={isClosed ? Colors.success : Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 反馈主体 */}
        <View style={styles.feedbackCard}>
          {/* 标题 */}
          <Text style={styles.feedbackTitle}>{feedback.title}</Text>

          {/* 标签行 */}
          <View style={styles.badgeRow}>
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

          {/* 创建者和时间 */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon
                type="ionicons"
                name={AppIcons.personOutline}
                size={16}
                color={Colors.textLight}
              />
              <Text style={styles.metaText}>
                {getDisplayName(feedback.userId, feedback.userName, feedback.userNickname)}
              </Text>
            </View>
            <Text style={styles.metaText}>
              创建于 {new Date(feedback.createTime).toLocaleString('zh-CN')}
            </Text>
          </View>

          {/* 描述 */}
          {feedback.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>{feedback.description}</Text>
            </View>
          )}

          {/* 管理员回复 */}
          {feedback.adminReply && (
            <View style={styles.adminReplyContainer}>
              <View style={styles.adminReplyHeader}>
                <Icon
                  type="feather"
                  name={FeatherIcons.mail}
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.adminReplyLabel}>管理员回复</Text>
              </View>
              <Text style={styles.adminReplyText}>{feedback.adminReply}</Text>
            </View>
          )}

          {/* 操作按钮（有权限者可见） */}
          {feedback.canDelete && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeleteFeedback}
              >
                <Icon
                  type="feather"
                  name={FeatherIcons.trash2}
                  size={16}
                  color={Colors.error}
                />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                  删除
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 评论标题 */}
        <View style={styles.commentsTitleContainer}>
          <Icon
            type="feather"
            name={FeatherIcons.messageSquare}
            size={18}
            color={Colors.text}
          />
          <Text style={styles.commentsTitle}>
            评论 ({comments.length})
          </Text>
        </View>

        {/* 评论列表 */}
        {comments.length > 0 ? (
          <View style={styles.commentsList}>
            {comments.map((comment, index) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAuthor}>
                    <Icon
                      type="ionicons"
                      name="person-circle"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.commentAuthorName}>
                      {getDisplayName(comment.userId, comment.userName, comment.userNickname)}
                    </Text>
                  </View>
                  <Text style={styles.commentTime}>
                    {new Date(comment.createTime).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyComments}>
            <Icon
              type="feather"
              name={FeatherIcons.messageSquare}
              size={48}
              color={Colors.textLight}
            />
            <Text style={styles.emptyCommentsText}>还没有评论</Text>
          </View>
        )}
      </ScrollView>

      {/* 评论输入框 */}
      {!isClosed && (
        <View style={[styles.commentInputContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.commentInputWrapper}>
            <TextInput
              style={styles.commentInput}
              placeholder="添加评论..."
              placeholderTextColor={Colors.textLight}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!commentText.trim() || isSubmittingComment) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <Icon
                  type="ionicons"
                  name={AppIcons.send}
                  size={20}
                  color={Colors.surface}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isClosed && (
        <View style={[styles.closedBanner, { paddingBottom: insets.bottom }]}>
          <Icon
            type="ionicons"
            name={AppIcons.lock}
            size={16}
            color={Colors.textSecondary}
          />
          <Text style={styles.closedBannerText}>此反馈已关闭</Text>
        </View>
      )}
    </KeyboardAvoidingView>
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
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  feedbackCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  feedbackTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
  },
  descriptionContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  descriptionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  adminReplyContainer: {
    backgroundColor: Colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  adminReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  adminReplyLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  adminReplyText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  deleteButton: {
    backgroundColor: Colors.error + '15',
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  deleteButtonText: {
    color: Colors.error,
  },
  commentsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  commentsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  commentsList: {
    paddingHorizontal: Spacing.md,
  },
  commentCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  commentAuthorName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  commentTime: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
  },
  commentContent: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyCommentsText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  commentInputContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 100,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.5,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  closedBannerText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
});
