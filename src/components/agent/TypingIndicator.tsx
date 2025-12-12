/**
 * TypingIndicator - AI 输入中指示器组件
 * 
 * 提供友好的等待体验：
 * - 动态跳动的点点动画
 * - 友好的提示文字
 * - 随机变化的提示语
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../constants/theme';

interface TypingIndicatorProps {
  /** 是否显示 */
  visible: boolean;
  /** 当前 Agent 状态（用于显示不同提示） */
  agentState?: 'idle' | 'parsing' | 'planning' | 'executing' | 'reflecting';
}

// 友好的提示语列表
const THINKING_MESSAGES = [
  '正在思考中...',
  '让我想想...',
  '处理中，请稍候...',
  '正在分析您的请求...',
  '稍等片刻...',
];

const STATE_MESSAGES: Record<string, string> = {
  parsing: '🔍 正在理解您的意图...',
  planning: '📝 正在规划执行步骤...',
  executing: '⚡ 正在执行操作...',
  reflecting: '💭 正在复核结果...',
};

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  visible, 
  agentState = 'idle',
}) => {
  // 动画值
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  
  // 随机提示语
  const [message, setMessage] = useState(THINKING_MESSAGES[0]);
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 启动点点动画
  useEffect(() => {
    if (!visible) return;

    const createDotAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      createDotAnimation(dot1Anim, 0),
      createDotAnimation(dot2Anim, 150),
      createDotAnimation(dot3Anim, 300),
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
    };
  }, [visible, dot1Anim, dot2Anim, dot3Anim]);

  // 定期更换提示语（仅在 idle 状态下）
  useEffect(() => {
    if (!visible) {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
      return;
    }

    // 如果有特定状态，使用状态对应的消息
    if (agentState !== 'idle' && STATE_MESSAGES[agentState]) {
      setMessage(STATE_MESSAGES[agentState]);
      return;
    }

    // 随机切换提示语
    messageIntervalRef.current = setInterval(() => {
      setMessage(prev => {
        const otherMessages = THINKING_MESSAGES.filter(m => m !== prev);
        return otherMessages[Math.floor(Math.random() * otherMessages.length)];
      });
    }, 3000);

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, [visible, agentState]);

  if (!visible) return null;

  const dotStyle = (animValue: Animated.Value) => ({
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
      {
        scale: animValue.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.2, 1],
        }),
      },
    ],
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {/* 内容区域 */}
        <View style={styles.contentContainer}>
          {/* 跳动的点点 */}
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, dotStyle(dot1Anim)]} />
            <Animated.View style={[styles.dot, dotStyle(dot2Anim)]} />
            <Animated.View style={[styles.dot, dotStyle(dot3Anim)]} />
          </View>
          
          {/* 提示文字 */}
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  avatarContainer: {
    display: 'none',
  },
  avatar: {
    display: 'none',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginRight: Spacing.sm,
    marginBottom: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginHorizontal: 2,
  },
  message: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});

export default TypingIndicator;
