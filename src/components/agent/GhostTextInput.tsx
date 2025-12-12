/**
 * GhostTextInput - 带幽灵文本（补全预览）的输入框
 * 
 * 实现类似 VS Code/Cursor 的自动补全效果：
 * - 用户输入的文字正常显示
 * - 补全建议以浅色"幽灵文字"显示在光标后
 * - 按 Tab/点击接受补全
 * 
 * 技术实现：
 * 采用 Z-轴层叠法：
 * 1. 底层：Text 组件，显示 [用户输入(透明) + 补全文字(灰色)]
 * 2. 顶层：TextInput 组件，显示用户输入（背景透明）
 * 
 * 注意：字体、大小、行高必须严格一致
 */

import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Keyboard,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Icon } from '../common';
import { completionService, CompletionCandidate } from '../../services/completionService';

/**
 * 组件 Props
 */
export interface GhostTextInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  /** 输入值 */
  value: string;
  /** 值变化回调 */
  onChangeText: (text: string) => void;
  /** 接受补全回调 */
  onAcceptCompletion?: (fullText: string) => void;
  /** 是否启用补全 */
  enableCompletion?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式 */
  containerStyle?: object;
}

/**
 * 组件 Ref 暴露的方法
 */
export interface GhostTextInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  acceptCompletion: () => void;
}

/**
 * GhostTextInput 组件
 */
export const GhostTextInput = forwardRef<GhostTextInputRef, GhostTextInputProps>(({
  value,
  onChangeText,
  onAcceptCompletion,
  enableCompletion = true,
  placeholder = '输入消息...',
  disabled = false,
  containerStyle,
  style,
  ...rest
}, ref) => {
  // 输入框 ref
  const inputRef = useRef<TextInput>(null);
  
  // 补全状态
  const [ghostText, setGhostText] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  
  // 是否正在输入（用于区分用户输入和程序设置）
  const isTypingRef = useRef<boolean>(false);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: () => {
      onChangeText('');
      setGhostText('');
    },
    acceptCompletion: () => handleAcceptCompletion(),
  }));

  // 初始化补全服务
  useEffect(() => {
    completionService.initialize().catch(console.error);
  }, []);

  /**
   * 处理文本变化
   */
  const handleChangeText = useCallback((text: string) => {
    isTypingRef.current = true;
    onChangeText(text);
    
    // 查询补全
    if (enableCompletion && text.length > 0) {
      const candidates = completionService.query(text, (aiResult) => {
        // AI 补全结果（异步）
        if (aiResult && aiResult.completion) {
          setGhostText(aiResult.completion);
        }
      });
      
      // 本地补全结果（同步）
      if (candidates.length > 0) {
        setGhostText(candidates[0].completion);
      } else {
        setGhostText('');
      }
    } else {
      setGhostText('');
    }
    
    isTypingRef.current = false;
  }, [enableCompletion, onChangeText]);

  /**
   * 处理光标位置变化
   */
  const handleSelectionChange = useCallback((
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    const { selection } = event.nativeEvent;
    setCursorPosition(selection.end);
    
    // 如果光标不在末尾，隐藏补全
    if (selection.end !== value.length) {
      setGhostText('');
    }
  }, [value.length]);

  /**
   * 接受补全
   */
  const handleAcceptCompletion = useCallback(() => {
    if (!ghostText) return;
    
    const fullText = value + ghostText;
    onChangeText(fullText);
    setGhostText('');
    
    // 记录采纳的建议
    completionService.recordAcceptedSuggestion(fullText).catch(console.error);
    
    // 回调
    onAcceptCompletion?.(fullText);
  }, [value, ghostText, onChangeText, onAcceptCompletion]);

  /**
   * 处理键盘事件（Tab 接受补全）
   * 注意：React Native 移动端没有 Tab 键，使用按钮代替
   */
  const handleKeyPress = useCallback((event: any) => {
    // 在某些场景下可能会有硬件键盘
    if (event.nativeEvent.key === 'Tab' && ghostText) {
      event.preventDefault?.();
      handleAcceptCompletion();
    }
  }, [ghostText, handleAcceptCompletion]);

  // 计算文本样式（确保两层完全对齐）
  const textStyle = {
    fontSize: FontSizes.md,
    lineHeight: FontSizes.md * 1.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 底层：Ghost Text Layer */}
      <View style={styles.ghostLayer} pointerEvents="none">
        <Text style={[styles.textBase, textStyle]} numberOfLines={1}>
          {/* 用户输入部分 - 透明 */}
          <Text style={styles.transparentText}>{value}</Text>
          {/* 补全部分 - 灰色 */}
          {ghostText && <Text style={styles.ghostText}>{ghostText}</Text>}
        </Text>
      </View>

      {/* 顶层：Input Layer */}
      <TextInput
        ref={inputRef}
        style={[styles.input, textStyle, style]}
        value={value}
        onChangeText={handleChangeText}
        onSelectionChange={handleSelectionChange}
        onKeyPress={handleKeyPress}
        placeholder={!value && !ghostText ? placeholder : undefined}
        placeholderTextColor={Colors.textSecondary}
        editable={!disabled}
        multiline={false}
        {...rest}
      />

      {/* 补全接受按钮 */}
      {ghostText && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAcceptCompletion}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  
  // Ghost 文字层（底层）
  ghostLayer: {
    position: 'absolute',
    left: 0,
    right: 40, // 为接受按钮留出空间
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  
  textBase: {
    // 基础文字样式，由 textStyle 变量动态设置
  },
  
  transparentText: {
    color: 'transparent', // 透明，让下层输入框的文字显示
  },
  
  ghostText: {
    color: Colors.textLight, // 浅灰色
    opacity: 0.6,
  },
  
  // 输入框层（顶层）
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    color: Colors.text,
    backgroundColor: 'transparent',
  },
  
  // 接受补全按钮
  acceptButton: {
    position: 'absolute',
    right: Spacing.sm,
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
