/**
 * InputBar - 消息输入栏组件
 * 
 * 支持：
 * - 文本输入
 * - 发送按钮
 * - 多行输入自动扩展
 * - 附件选择（图片、文件等）
 * - 附件预览
 * - 图片全屏预览
 */

import React, { useState, useCallback } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
} from 'react-native';
import { Icon } from '../common';
import { AttachmentPicker } from './AttachmentPicker';
import { AttachmentPreview } from './AttachmentPreview';
import { ImageViewer } from './ImageViewer';
import { PendingAttachment, Attachment } from '../../types/agent';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

interface InputBarProps {
  /** 发送回调 - 支持带附件发送 */
  onSend: (text: string, attachments?: PendingAttachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** 是否启用附件功能 */
  enableAttachments?: boolean;
  /** 最大附件数量 */
  maxAttachments?: number;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSend,
  disabled = false,
  placeholder = '输入消息...',
  enableAttachments = true,
  maxAttachments = 9,
}) => {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  /**
   * 处理发送
   */
  const handleSend = useCallback(() => {
    const hasText = text.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    
    if ((!hasText && !hasAttachments) || disabled) return;

    // 发送消息（带附件）
    onSend(text.trim(), pendingAttachments.length > 0 ? pendingAttachments : undefined);
    
    // 清空状态
    setText('');
    setPendingAttachments([]);
    setInputHeight(40);
  }, [text, pendingAttachments, disabled, onSend]);

  /**
   * 处理文本变化
   */
  const handleContentSizeChange = useCallback((event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(40, height), 120);
    setInputHeight(newHeight);
  }, []);

  /**
   * 处理附件选择
   */
  const handleAttachmentSelected = useCallback((attachments: PendingAttachment[]) => {
    setPendingAttachments(prev => {
      const combined = [...prev, ...attachments];
      // 限制最大数量
      return combined.slice(0, maxAttachments);
    });
  }, [maxAttachments]);

  /**
   * 移除附件
   */
  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, []);

  /**
   * 打开附件选择器
   */
  const handleOpenAttachmentPicker = useCallback(() => {
    if (disabled) return;
    setShowAttachmentPicker(true);
  }, [disabled]);

  /**
   * 点击附件预览 - 打开全屏查看
   */
  const handleAttachmentPress = useCallback((attachment: PendingAttachment) => {
    const index = pendingAttachments.findIndex(a => a.id === attachment.id);
    if (index >= 0) {
      setPreviewImageIndex(index);
      setShowImageViewer(true);
    }
  }, [pendingAttachments]);

  // 获取图片类型的附件用于预览
  const imageAttachments = pendingAttachments.filter(a => a.type === 'image');

  // 是否可以发送
  const canSend = (text.trim().length > 0 || pendingAttachments.length > 0) && !disabled;

  return (
    <View style={styles.wrapper}>
      {/* 附件预览区域 */}
      {pendingAttachments.length > 0 && (
        <AttachmentPreview
          attachments={pendingAttachments}
          onRemove={handleRemoveAttachment}
          onPress={handleAttachmentPress}
        />
      )}
      
      {/* 输入栏 */}
      <View style={styles.container}>
        {/* 左侧：附件按钮 */}
        {enableAttachments && (
          <TouchableOpacity 
            style={styles.iconButton}
            disabled={disabled}
            onPress={handleOpenAttachmentPicker}
          >
            <Icon 
              name="add-circle-outline" 
              size={24} 
              color={disabled ? Colors.textDisabled : Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}

        {/* 中间：输入框 */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { height: inputHeight }]}
            value={text}
            onChangeText={setText}
            placeholder={pendingAttachments.length > 0 ? '添加说明...' : placeholder}
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={2000}
            editable={!disabled}
            onContentSizeChange={handleContentSizeChange}
            returnKeyType="default"
          />
        </View>

        {/* 右侧：发送按钮 */}
        <TouchableOpacity
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Icon 
            name="send" 
            size={20} 
            color={canSend ? Colors.surface : Colors.textDisabled} 
          />
        </TouchableOpacity>
      </View>

      {/* 附件选择器 */}
      <AttachmentPicker
        visible={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        onAttachmentSelected={handleAttachmentSelected}
        maxCount={maxAttachments - pendingAttachments.length}
      />

      {/* 图片全屏预览 */}
      <ImageViewer
        visible={showImageViewer}
        images={imageAttachments}
        initialIndex={previewImageIndex}
        onClose={() => setShowImageViewer(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // 图标按钮
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
    marginBottom: 2,
  },

  // 输入框包装
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : 0,
    marginRight: Spacing.xs,
  },

  // 输入框
  input: {
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Platform.OS === 'ios' ? 0 : Spacing.xs,
    textAlignVertical: 'top',
  },

  // 发送按钮
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.textDisabled,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
});
