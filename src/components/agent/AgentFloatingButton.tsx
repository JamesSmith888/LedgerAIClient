import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, PanResponder, Dimensions } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgent } from '../../context/AgentContext';
import { AgentState } from '../../agent/statefulAgent';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/theme';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_WIDTH = 140; // 展开时的宽度
const BUTTON_HEIGHT = 48;
const DOCK_WIDTH = 48; // 收起时的宽度
const EDGE_THRESHOLD = 50; // 吸附阈值

export const AgentFloatingButton: React.FC = () => {
  const { agentState } = useAgent();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  // 状态管理
  const [showCompleted, setShowCompleted] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right'); // 默认吸附在右侧
  
  // 拖动位置状态 - 初始位置在右下侧
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - BUTTON_WIDTH - Spacing.md, y: SCREEN_HEIGHT - 200 })).current;
  const [isDragging, setIsDragging] = useState(false);
  
  // 监听 Agent 状态变化，处理完成状态
  useEffect(() => {
    // 使用类型断言避免潜在的类型推断错误
    if ((agentState as any) === AgentState.COMPLETED) {
      setShowCompleted(true);
    } else if (agentState !== AgentState.IDLE && (agentState as any) !== AgentState.COMPLETED) {
      // 任务开始或进行中，重置完成状态
      setShowCompleted(false);
    }
  }, [agentState]);

  // 获取当前路由名称
  let currentRouteName: string | null = null;
  try {
    currentRouteName = useNavigationState(state => {
      if (!state) return null;
      
      const getActiveRouteName = (route: any): string => {
        if (!route.state) return route.name;
        // 处理 Tab Navigator 或 Stack Navigator 的嵌套
        if (route.state.routes && route.state.routes[route.state.index]) {
          return getActiveRouteName(route.state.routes[route.state.index]);
        }
        return route.name;
      };
      
      return getActiveRouteName(state.routes[state.index]);
    });
  } catch (error) {
    currentRouteName = null;
  }

  const isAgentActive = agentState !== AgentState.IDLE && (agentState as any) !== AgentState.COMPLETED;
  const isAgentScreen = currentRouteName === 'Agent';
  
  // 如果用户回到了 Agent 页面，自动清除完成提示
  useEffect(() => {
    if (isAgentScreen && showCompleted) {
      setShowCompleted(false);
    }
  }, [isAgentScreen, showCompleted]);

  // 显示条件：(Agent正在工作 OR 显示完成提示) AND 不在Agent页面
  const visible = (isAgentActive || showCompleted) && !isAgentScreen;

  const getStatusText = () => {
    if (showCompleted) return '已完成';
    switch (agentState) {
      case AgentState.PARSING: return '理解中...';
      case AgentState.PLANNING: return '规划中...';
      case AgentState.EXECUTING: return '执行中...';
      case AgentState.REFLECTING: return '思考中...';
      case AgentState.AWAITING_CONFIRMATION: return '等待确认';
      default: return '处理中...';
    }
  };

  const handlePress = () => {
    if (isDocked) {
      // 如果是吸附状态，点击展开
      setIsDocked(false);
      // 稍微向屏幕内移动一点，避免紧贴边缘
      const targetX = dockSide === 'left' ? Spacing.md : SCREEN_WIDTH - BUTTON_WIDTH - Spacing.md;
      Animated.spring(pan, {
        toValue: { x: targetX, y: (pan.y as any)._value },
        useNativeDriver: false,
      }).start();
    } else {
      // 导航回 Agent 页面
      navigation.navigate('MainTabs', { screen: 'Agent' });
      // 导航后清除完成状态
      if (showCompleted) {
        setShowCompleted(false);
      }
    }
  };
  
  // PanResponder for drag functionality
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        // 拖动开始时，如果是吸附状态，先展开（视觉上）或者保持原样，这里选择保持原样直到移动
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        // 如果正在拖动且之前是吸附状态，一旦移动距离超过阈值，就认为解除了吸附
        if (isDocked && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5)) {
          setIsDocked(false);
        }
        return Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        )(_, gesture);
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        setIsDragging(false);
        
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;
        
        // 如果拖动距离很小，视为点击
        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          handlePress();
          return;
        }

        // 边界限制和吸附逻辑
        let targetX = currentX;
        // 使用 safe area top 作为顶部边界
        let targetY = Math.max(insets.top + 10, Math.min(currentY, SCREEN_HEIGHT - 100));
        let newIsDocked = false;
        let newDockSide = dockSide;

        // 检查是否靠近左边缘
        if (currentX < EDGE_THRESHOLD) {
          targetX = 0; // 吸附到左边
          newIsDocked = true;
          newDockSide = 'left';
        } 
        // 检查是否靠近右边缘
        // 使用 DOCK_WIDTH 作为阈值，避免从右侧吸附状态拖出时需要过大距离
        else if (currentX > SCREEN_WIDTH - DOCK_WIDTH - EDGE_THRESHOLD) {
          targetX = SCREEN_WIDTH - DOCK_WIDTH; // 吸附到右边（收起状态宽度）
          newIsDocked = true;
          newDockSide = 'right';
        } 
        // 如果没有吸附，限制在屏幕内
        else {
          targetX = Math.max(0, Math.min(currentX, SCREEN_WIDTH - BUTTON_WIDTH));
        }

        setIsDocked(newIsDocked);
        if (newIsDocked) {
          setDockSide(newDockSide);
        }

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 6,
        }).start();
      },
    })
  ).current;

  if (!visible) return null;

  // 渲染吸附状态（小窗口）
  if (isDocked) {
    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.dockedContainer,
          dockSide === 'left' ? styles.dockedLeft : styles.dockedRight,
          {
            transform: pan.getTranslateTransform(),
            opacity: isDragging ? 0.8 : 1,
          },
        ]}
      >
        <View style={[
          styles.dockedIconContainer, 
          showCompleted && styles.completedIconContainer,
          agentState === AgentState.AWAITING_CONFIRMATION && styles.warningIconContainer
        ]}>
          {showCompleted ? (
            <Icon name="checkmark" size={24} color="#FFF" />
          ) : agentState === AgentState.AWAITING_CONFIRMATION ? (
            <Icon name="alert" size={24} color="#FFF" />
          ) : (
            <ActivityIndicator size="small" color="#FFF" />
          )}
        </View>
      </Animated.View>
    );
  }

  // 渲染正常状态
  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: pan.getTranslateTransform(),
          opacity: isDragging ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {showCompleted ? (
          <View style={[styles.iconContainer, styles.completedIconContainer]}>
            <Icon name="checkmark" size={20} color="#FFF" />
          </View>
        ) : agentState === AgentState.AWAITING_CONFIRMATION ? (
          <View style={[styles.iconContainer, styles.warningIconContainer]}>
            <Icon name="alert" size={20} color="#FFF" />
          </View>
        ) : (
          <View style={styles.iconContainer}>
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>AI 助手</Text>
          <Text style={styles.status}>{getStatusText()}</Text>
        </View>
        <Icon name="chevron-forward" size={16} color={Colors.textSecondary} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    backgroundColor: Colors.surface,
    borderRadius: BUTTON_HEIGHT / 2,
    ...Shadows.md,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  completedIconContainer: {
    backgroundColor: Colors.success,
  },
  warningIconContainer: {
    backgroundColor: Colors.warning,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text,
  },
  status: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  
  // 吸附状态样式
  dockedContainer: {
    position: 'absolute',
    width: DOCK_WIDTH,
    height: DOCK_WIDTH,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    // 避免父级阴影形成方形边框
    backgroundColor: 'transparent',
  },
  dockedLeft: {
    borderTopRightRadius: DOCK_WIDTH / 2,
    borderBottomRightRadius: DOCK_WIDTH / 2,
  },
  dockedRight: {
    borderTopLeftRadius: DOCK_WIDTH / 2,
    borderBottomLeftRadius: DOCK_WIDTH / 2,
  },
  dockedIconContainer: {
    width: DOCK_WIDTH,
    height: DOCK_WIDTH,
    borderRadius: DOCK_WIDTH / 2, // 圆形
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // 将阴影移动到内层圆形，避免出现外层方形边框
    ...Shadows.md,
  },
});
