/**
 * VoiceRecordButton - 语音录制按钮组件
 * 
 * 功能：
 * 1. 长按录音，松手发送
 * 2. 上滑取消录音
 * 3. 录音时长和音量动画反馈
 * 4. 检测模型是否支持音频
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  Alert,
  Vibration,
  GestureResponderEvent,
  PanResponder,
  PanResponderInstance,
  TouchableOpacity,
} from 'react-native';
import { Icon } from '../common';
import { audioRecorderService, RecordingProgress, RecordingResult } from '../../services/audioRecorderService';
import { checkProviderCapability } from '../../agent/modelFactory';
import { AIProvider, AI_PROVIDERS } from '../../services/apiKeyStorage';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants/theme';

// ============ 类型定义 ============

export interface VoiceRecordButtonProps {
  /** 录音完成回调 */
  onRecordComplete: (result: RecordingResult) => void;
  /** 当前 AI 提供商 */
  currentProvider: AIProvider;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否正在处理 */
  isProcessing?: boolean;
}

// ============ 常量 ============

/** 取消录音的上滑阈值 */
const CANCEL_THRESHOLD = 80;

/** 最小录音时长（毫秒） */
const MIN_RECORDING_DURATION = 500;

// ============ 组件实现 ============

export const VoiceRecordButton: React.FC<VoiceRecordButtonProps> = ({
  onRecordComplete,
  currentProvider,
  disabled = false,
  isProcessing = false,
}) => {
  // 状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showCancelHint, setShowCancelHint] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  
  // 动画值
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const volumeAnim = useRef(new Animated.Value(0.3)).current;
  
  // 引用
  const recordingStartTime = useRef<number>(0);
  const startY = useRef<number>(0);
  const cancelledRef = useRef(false);
  const showCancelHintRef = useRef(false);
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isRecordingRef = useRef(false);

  // 检查当前模型是否支持音频
  const supportsAudio = checkProviderCapability(currentProvider, 'audio');
  const providerConfig = AI_PROVIDERS[currentProvider];

  /**
   * 开始脉冲动画
   */
  const startPulseAnimation = useCallback(() => {
    pulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimationRef.current.start();
  }, [pulseAnim]);

  /**
   * 停止脉冲动画
   */
  const stopPulseAnimation = useCallback(() => {
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  /**
   * 处理录音进度
   */
  const handleRecordingProgress = useCallback((progress: RecordingProgress) => {
    setRecordingDuration(progress.currentPosition);
    
    // 根据音量更新动画
    if (progress.currentMetering !== undefined) {
      const normalizedVolume = Math.max(0.3, Math.min(1, progress.currentMetering));
      Animated.timing(volumeAnim, {
        toValue: normalizedVolume,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [volumeAnim]);

  /**
   * 停止录音并发送（内部使用，不检查 isRecording 状态）
   */
  const doStopRecording = useCallback(async (shouldCancel: boolean) => {
    console.log('🛑 [VoiceRecordButton] doStopRecording called, shouldCancel:', shouldCancel);
    
    try {
      // 停止动画
      stopPulseAnimation();
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      // 检查是否被取消
      if (shouldCancel) {
        await audioRecorderService.cancelRecording();
        console.log('🗑️ [VoiceRecordButton] Recording cancelled');
        setIsRecording(false);
        isRecordingRef.current = false;
        setShowRecordingModal(false);
        setShowCancelHint(false);
        return;
      }

      // 检查录音时长
      const duration = Date.now() - recordingStartTime.current;
      if (duration < MIN_RECORDING_DURATION) {
        await audioRecorderService.cancelRecording();
        Alert.alert('录音太短', '请按住说话，松手发送');
        setIsRecording(false);
        isRecordingRef.current = false;
        setShowRecordingModal(false);
        setShowCancelHint(false);
        return;
      }

      // 停止录音并获取结果
      const result = await audioRecorderService.stopRecording();
      
      if (result) {
        console.log('✅ [VoiceRecordButton] Recording completed:', result.duration.toFixed(1) + 's');
        onRecordComplete(result);
      }
      
      setIsRecording(false);
      isRecordingRef.current = false;
      setShowRecordingModal(false);
      setShowCancelHint(false);
    } catch (error: any) {
      console.error('❌ [VoiceRecordButton] Stop recording failed:', error);
      Alert.alert('录音失败', error.message || '处理录音时出错');
      setIsRecording(false);
      isRecordingRef.current = false;
      setShowRecordingModal(false);
      setShowCancelHint(false);
    }
  }, [scaleAnim, stopPulseAnimation, onRecordComplete]);

  /**
   * 开始录音
   */
  const startRecording = useCallback(async (initialY: number) => {
    if (!supportsAudio) {
      Alert.alert(
        '不支持语音输入',
        `${providerConfig.name} 暂不支持语音输入功能。\n\n请切换到 Google Gemini 模型使用语音输入。`,
        [{ text: '我知道了' }]
      );
      return;
    }

    if (disabled || isProcessing) return;

    try {
      cancelledRef.current = false;
      showCancelHintRef.current = false;
      recordingStartTime.current = Date.now();
      startY.current = initialY;
      
      // 开始录音
      await audioRecorderService.startRecording(handleRecordingProgress);
      
      setIsRecording(true);
      isRecordingRef.current = true;
      setShowRecordingModal(true);
      setRecordingDuration(0);
      
      // 震动反馈
      Vibration.vibrate(50);
      
      // 开始按钮缩放动画
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }).start();
      
      // 开始脉冲动画
      startPulseAnimation();
      
      console.log('🎙️ [VoiceRecordButton] Recording started');
    } catch (error: any) {
      console.error('❌ [VoiceRecordButton] Start recording failed:', error);
      Alert.alert('录音失败', error.message || '无法启动录音，请检查麦克风权限');
      setIsRecording(false);
      isRecordingRef.current = false;
      setShowRecordingModal(false);
    }
  }, [supportsAudio, providerConfig, disabled, isProcessing, scaleAnim, startPulseAnimation, handleRecordingProgress]);

  /**
   * 格式化录音时长
   */
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * 处理按下开始
   */
  const handlePressIn = useCallback((e: GestureResponderEvent) => {
    const initialY = e.nativeEvent.pageY;
    startRecording(initialY);
  }, [startRecording]);

  /**
   * 处理普通点击（不支持音频时的提示）
   */
  const handlePress = useCallback(() => {
    if (!supportsAudio) {
      Alert.alert(
        '不支持语音输入',
        `${providerConfig.name} 暂不支持语音输入功能。\n\n支持语音输入的模型：\n• Google Gemini（推荐）`,
        [{ text: '我知道了' }]
      );
    }
  }, [supportsAudio, providerConfig]);

  /**
   * Modal 内的 PanResponder 用于处理手势
   */
  const panResponder = useMemo<PanResponderInstance>(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        // 记录起始位置
        startY.current = e.nativeEvent.pageY;
        console.log('📍 [VoiceRecordButton] PanResponder grant, startY:', startY.current);
      },
      onPanResponderMove: (e, gestureState) => {
        if (!isRecordingRef.current) return;
        
        const deltaY = -gestureState.dy; // 向上滑动 dy 为负，取反使其为正
        
        if (deltaY > CANCEL_THRESHOLD) {
          if (!showCancelHintRef.current) {
            showCancelHintRef.current = true;
            setShowCancelHint(true);
            Vibration.vibrate(30);
          }
        } else {
          if (showCancelHintRef.current) {
            showCancelHintRef.current = false;
            setShowCancelHint(false);
          }
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        console.log('👆 [VoiceRecordButton] PanResponder release, dy:', gestureState.dy);
        
        if (!isRecordingRef.current) return;
        
        const deltaY = -gestureState.dy;
        const shouldCancel = deltaY > CANCEL_THRESHOLD;
        
        doStopRecording(shouldCancel);
      },
      onPanResponderTerminate: () => {
        // 被其他手势打断时取消录音
        if (isRecordingRef.current) {
          doStopRecording(true);
        }
      },
    }), [doStopRecording]);

  /**
   * 处理取消按钮点击
   */
  const handleCancelPress = useCallback(() => {
    if (isRecordingRef.current) {
      doStopRecording(true);
    }
  }, [doStopRecording]);

  /**
   * 处理发送按钮点击
   */
  const handleSendPress = useCallback(() => {
    if (isRecordingRef.current) {
      doStopRecording(false);
    }
  }, [doStopRecording]);

  // 清理
  useEffect(() => {
    return () => {
      if (audioRecorderService.isRecording()) {
        audioRecorderService.cancelRecording();
      }
    };
  }, []);

  return (
    <>
      {/* 语音按钮 */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          style={[
            styles.voiceButton,
            !supportsAudio && styles.voiceButtonDisabled,
            (disabled || isProcessing) && styles.voiceButtonDisabled,
          ]}
          onPress={handlePress}
          onPressIn={supportsAudio && !disabled && !isProcessing ? handlePressIn : undefined}
          disabled={disabled || isProcessing}
        >
          <Icon 
            name="mic" 
            size={22} 
            color={
              !supportsAudio ? Colors.textDisabled :
              (disabled || isProcessing) ? Colors.textDisabled : 
              Colors.textSecondary
            } 
          />
        </Pressable>
      </Animated.View>

      {/* 录音中弹窗 */}
      <Modal
        visible={showRecordingModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelPress}
      >
        <View 
          style={styles.modalOverlay}
          {...panResponder.panHandlers}
        >
          <View style={[
            styles.recordingModal,
            showCancelHint && styles.recordingModalCancel,
          ]}>
            {/* 脉冲动画圈 */}
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: volumeAnim,
                },
              ]}
            />
            
            {/* 麦克风图标 */}
            <View style={[
              styles.micContainer,
              showCancelHint && styles.micContainerCancel,
            ]}>
              <Icon 
                name={showCancelHint ? 'close' : 'mic'} 
                size={40} 
                color={showCancelHint ? Colors.error : Colors.primary} 
              />
            </View>

            {/* 状态文本 */}
            <Text style={styles.recordingText}>
              {showCancelHint ? '松手取消' : '正在录音...'}
            </Text>

            {/* 录音时长 */}
            <Text style={[
              styles.durationText,
              showCancelHint && styles.durationTextCancel,
            ]}>
              {formatDuration(recordingDuration)}
            </Text>

            {/* 提示文本 */}
            <Text style={styles.hintText}>
              {showCancelHint ? '↑ 松手取消发送' : '↑ 上滑取消  ↓ 松手发送'}
            </Text>
          </View>
          
          {/* 底部操作按钮 */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelPress}
              activeOpacity={0.7}
            >
              <Icon name="close" size={24} color={Colors.error} />
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSendPress}
              activeOpacity={0.7}
            >
              <Icon name="send" size={24} color={Colors.surface} />
              <Text style={styles.sendButtonText}>发送</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ============ 样式 ============

const styles = StyleSheet.create({
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },

  // 录音弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingModal: {
    width: 180,
    height: 180,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  recordingModalCancel: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  // 脉冲动画
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },

  // 麦克风容器
  micContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  micContainerCancel: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },

  // 文本样式
  recordingText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  durationText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  durationTextCancel: {
    color: Colors.error,
  },
  hintText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // 底部操作按钮
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 60,
  },
  cancelButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: 2,
  },
  sendButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    marginTop: 2,
  },
});
