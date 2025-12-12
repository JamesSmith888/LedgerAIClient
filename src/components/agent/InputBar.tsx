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
 * - 语音输入（长按录音）
 */

import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { 
  View, 
  Text,
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
} from 'react-native';
import { Icon } from '../common';
import { AttachmentPicker } from './AttachmentPicker';
import { AttachmentPreview } from './AttachmentPreview';
import { ImageViewer } from './ImageViewer';
import { VoiceRecordButton } from './VoiceRecordButton';
import { PendingAttachment, Attachment } from '../../types/agent';
import { AIProvider } from '../../services/apiKeyStorage';
import { RecordingResult } from '../../services/audioRecorderService';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { completionService, CompletionCandidate } from '../../services/completionService';

/**
 * 音频附件类型
 */
export interface AudioAttachment {
  id: string;
  type: 'audio';
  base64: string;
  mimeType: string;
  duration: number;
  fileSize: number;
}

/**
 * InputBar 暴露给外部的方法
 */
export interface InputBarHandle {
  /** 清空输入框 */
  clear: () => void;
  /** 设置输入框文本 */
  setText: (text: string) => void;
  /** 获取当前文本 */
  getText: () => string;
}

/**
 * 音频附件类型
 */
export interface AudioAttachment {
  id: string;
  type: 'audio';
  base64: string;
  mimeType: string;
  duration: number;
  fileSize: number;
}

interface InputBarProps {
  /** 发送回调 - 支持带附件发送 */
  onSend: (text: string, attachments?: PendingAttachment[]) => void;
  /** 语音消息发送回调 */
  onSendVoice?: (audio: AudioAttachment) => void;
  disabled?: boolean;
  placeholder?: string;
  /** 是否启用附件功能 */
  enableAttachments?: boolean;
  /** 是否启用语音功能 */
  enableVoice?: boolean;
  /** 当前 AI 提供商（用于检测语音支持） */
  currentProvider?: AIProvider;
  /** 最大附件数量 */
  maxAttachments?: number;
  /** 是否正在处理/执行中 */
  isProcessing?: boolean;
  /** 取消执行回调 */
  onCancel?: () => void;
  /** 自动填充的建议文本（不再自动填充，仅供参考） */
  topSuggestion?: string;
  /** 是否启用智能补全（输入时自动补全） */
  enableCompletion?: boolean;
}

export const InputBar = forwardRef<InputBarHandle, InputBarProps>(({
  onSend,
  onSendVoice,
  disabled = false,
  placeholder = '输入消息...',
  enableAttachments = true,
  enableVoice = true,
  currentProvider = 'gemini',
  maxAttachments = 9,
  isProcessing = false,
  onCancel,
  topSuggestion,
  enableCompletion = true,
}, ref) => {
  const [text, setTextState] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  
  // 自动填充逻辑（来自 SuggestedActionsBar）
  const lastTopSuggestionRef = useRef<string | undefined>(undefined);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  
  // 智能补全状态（输入时触发）
  const [ghostText, setGhostText] = useState<string>('');
  const [completionSource, setCompletionSource] = useState<'local' | 'remote' | 'ai' | null>(null);

  // 封装 setText，用于内部调用
  const setText = useCallback((newText: string) => {
    setTextState(newText);
  }, []);

  // 暴露给外部的方法
  useImperativeHandle(ref, () => ({
    clear: () => {
      setText('');
      setGhostText('');
      setCompletionSource(null);
      setPendingAttachments([]);
      setInputHeight(40);
      setIsAutoFilled(false);
    },
    setText: (newText: string) => {
      setText(newText);
      setIsAutoFilled(false);
    },
    getText: () => text,
  }), [text, setText]);

  // 初始化补全服务
  useEffect(() => {
    if (enableCompletion) {
      completionService.initialize().catch(console.error);
    }
  }, [enableCompletion]);

  // 监听 topSuggestion 变化
  // 注意：不再自动填充到输入框，因为这对用户来说太突兀
  // 建议会在输入框上方的推荐栏展示
  useEffect(() => {
    if (topSuggestion) {
      lastTopSuggestionRef.current = topSuggestion;
    } else {
      lastTopSuggestionRef.current = undefined;
      // 清除自动填充状态
      if (isAutoFilled) {
        setIsAutoFilled(false);
      }
    }
  }, [topSuggestion, isAutoFilled]);

  /**
   * 处理文本变化
   */
  const handleTextChange = useCallback((newText: string) => {
    console.log('✏️ [InputBar] Text changed:', JSON.stringify(newText));
    setText(newText);
    if (isAutoFilled && newText !== lastTopSuggestionRef.current) {
      setIsAutoFilled(false);
    }
    
    // 智能补全：查询候选
    if (enableCompletion && newText.length > 0 && !isProcessing) {
      console.log('✏️ [InputBar] Querying completion...');
      const candidates = completionService.query(newText, (aiResult) => {
        // AI 补全结果（异步回调）
        console.log('✏️ [InputBar] AI callback received:', aiResult);
        if (aiResult && aiResult.completion) {
          console.log('✏️ [InputBar] Setting ghost text from AI:', aiResult.completion);
          setGhostText(aiResult.completion);
          setCompletionSource(aiResult.source);
        }
      });
      
      console.log('✏️ [InputBar] Local candidates:', candidates.length, candidates.map(c => c.completion));
      // 本地补全结果（同步）
      if (candidates.length > 0) {
        console.log('✏️ [InputBar] Setting ghost text from local:', candidates[0].completion);
        setGhostText(candidates[0].completion);
        setCompletionSource(candidates[0].source);
      } else {
        setGhostText('');
        setCompletionSource(null);
      }
    } else {
      setGhostText('');
      setCompletionSource(null);
    }
  }, [isAutoFilled, enableCompletion, isProcessing]);

  /**
   * 接受补全
   */
  const handleAcceptCompletion = useCallback(() => {
    if (!ghostText) return;
    
    const fullText = text + ghostText;
    setText(fullText);
    setGhostText('');
    setCompletionSource(null);
    
    // 记录采纳的建议
    completionService.recordAcceptedSuggestion(fullText).catch(console.error);
  }, [text, ghostText]);

  /**
   * 清除自动填充的内容
   */
  const handleClearAutoFill = useCallback(() => {
    setText('');
    setIsAutoFilled(false);
  }, []);

  /**
   * 处理发送
   */
  const handleSend = useCallback(() => {
    const hasText = text.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    
    if ((!hasText && !hasAttachments) || disabled) return;

    // 发送消息（带附件）
    onSend(text.trim(), pendingAttachments.length > 0 ? pendingAttachments : undefined);
    
    // 记录用户输入到补全服务
    if (text.trim().length >= 2) {
      completionService.recordUserInput(text.trim()).catch(console.error);
    }
    
    // 清空状态
    setText('');
    setPendingAttachments([]);
    setInputHeight(40);
    setIsAutoFilled(false);
    setGhostText('');
    setCompletionSource(null);
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
    if (disabled || isProcessing) return;
    setShowAttachmentPicker(true);
  }, [disabled, isProcessing]);

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

  /**
   * 处理取消执行
   */
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  /**
   * 处理语音录制完成
   */
  const handleVoiceRecordComplete = useCallback((result: RecordingResult) => {
    console.log('🎙️ [InputBar] Voice recording completed:', {
      duration: result.duration.toFixed(1) + 's',
      size: (result.fileSize / 1024).toFixed(1) + 'KB',
    });

    if (onSendVoice) {
      // 如果有专门的语音发送回调，使用它
      const audioAttachment: AudioAttachment = {
        id: `audio_${Date.now()}`,
        type: 'audio',
        base64: result.base64,
        mimeType: result.mimeType,
        duration: result.duration,
        fileSize: result.fileSize,
      };
      onSendVoice(audioAttachment);
    } else {
      // 否则将音频作为附件发送（会触发 Agent 处理）
      const audioPendingAttachment: PendingAttachment = {
        id: `audio_${Date.now()}`,
        type: 'audio' as any, // 扩展类型
        uri: result.filePath,
        name: `语音消息 ${result.duration.toFixed(0)}秒`,
        size: result.fileSize,
        mimeType: result.mimeType,
        base64: result.base64,
      };
      onSend('', [audioPendingAttachment]);
    }
  }, [onSend, onSendVoice]);

  // 获取图片类型的附件用于预览
  const imageAttachments = pendingAttachments.filter(a => a.type === 'image');

  // 是否可以发送（非处理状态时才能发送）
  const canSend = (text.trim().length > 0 || pendingAttachments.length > 0) && !disabled && !isProcessing;

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
            disabled={disabled || isProcessing}
            onPress={handleOpenAttachmentPicker}
          >
            <Icon 
              name="add-circle-outline" 
              size={24} 
              color={(disabled || isProcessing) ? Colors.textDisabled : Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}

        {/* 中间：输入框 + 补全提示 */}
        <View style={styles.inputWrapper}>
          {/* 输入内容区域：使用 ScrollView 让内容可以横向滚动 */}
          <View style={styles.inputContentRow}>
            {/* 真实的输入框 */}
            <TextInput
              style={[
                styles.input, 
                { height: inputHeight },
                // 有补全时，输入框不占满，让补全文字紧跟其后
                ghostText ? styles.inputWithGhost : styles.inputFull,
              ]}
              value={text}
              onChangeText={handleTextChange}
              placeholder={isProcessing ? 'AI 正在处理中...' : (pendingAttachments.length > 0 ? '添加说明...' : placeholder)}
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={2000}
              editable={!disabled && !isProcessing}
              onContentSizeChange={handleContentSizeChange}
              returnKeyType="default"
              selectionColor={Colors.primary}
            />
            
            {/* 补全提示文字（紧跟在输入文字后面） */}
            {ghostText ? (
              <Text style={styles.ghostText} numberOfLines={1}>{ghostText}</Text>
            ) : null}
          </View>
          
          {/* 右侧操作按钮 */}
          {ghostText ? (
            <View style={styles.ghostActions}>
              {completionSource === 'ai' && (
                <Icon name="sparkles" size={12} color={Colors.primary} style={{ marginRight: 2 }} />
              )}
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={handleAcceptCompletion}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="arrow-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null}
          
          {/* 清除建议按钮 - 仅在内容是自动填充时显示 */}
          {isAutoFilled && text === lastTopSuggestionRef.current && !ghostText && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClearAutoFill}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close-circle" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* 语音按钮（当输入框为空且没有附件时显示） */}
        {enableVoice && !text.trim() && pendingAttachments.length === 0 && !isProcessing && (
          <View style={styles.voiceButtonWrapper}>
            <VoiceRecordButton
              onRecordComplete={handleVoiceRecordComplete}
              currentProvider={currentProvider}
              disabled={disabled}
              isProcessing={isProcessing}
            />
          </View>
        )}

        {/* 右侧：发送按钮 / 取消按钮 */}
        {isProcessing ? (
          // 处理中显示取消按钮
          <TouchableOpacity
            style={[styles.sendButton, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Icon 
              name="stop-circle-outline" 
              size={22} 
              color={Colors.surface} 
            />
          </TouchableOpacity>
        ) : (
          // 非处理中显示发送按钮
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
        )}
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
});

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // 输入内容行（输入框 + 补全文字）
  inputContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },

  // 输入框基础样式
  input: {
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false, // Android: 移除额外的字体 padding
  },
  
  // 有补全时，输入框自适应宽度
  inputWithGhost: {
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 20,
  },
  
  // 无补全时，输入框占满
  inputFull: {
    flex: 1,
  },
  
  // 补全提示文字
  ghostText: {
    color: Colors.textSecondary,
    opacity: 0.6,
    fontSize: FontSizes.md,
    flexShrink: 1,
  },
  
  // 补全操作按钮容器
  ghostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  
  // 接受补全按钮
  acceptButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  
  // 来源指示器
  sourceIndicator: {
    marginRight: 2,
    padding: 2,
  },
  
  // 清除按钮
  clearButton: {
    padding: 4,
    marginLeft: 4,
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
  cancelButton: {
    backgroundColor: Colors.error,
  },

  // 语音按钮包装
  voiceButtonWrapper: {
    marginRight: Spacing.xs,
    marginBottom: 2,
  },
});
