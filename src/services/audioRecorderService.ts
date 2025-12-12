/**
 * Audio Recorder Service - 语音录制服务
 * 
 * 功能：
 * 1. 录制音频（支持多种格式）
 * 2. 获取 Base64 编码的音频数据
 * 3. 权限管理
 * 
 * 使用自定义原生模块实现
 */

import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';

// 获取原生模块
const { AudioRecorderModule } = NativeModules;

// ============ 类型定义 ============

/**
 * 录音状态
 */
export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * 录音结果
 */
export interface RecordingResult {
  /** 音频文件路径 */
  filePath: string;
  /** 音频时长（秒） */
  duration: number;
  /** Base64 编码的音频数据 */
  base64: string;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小（字节） */
  fileSize: number;
}

/**
 * 录音进度回调
 */
export interface RecordingProgress {
  /** 当前录音时长（毫秒） */
  currentPosition: number;
  /** 当前音量（0-1） */
  currentMetering?: number;
}

/**
 * 权限状态
 */
export interface PermissionStatus {
  granted: boolean;
  canAsk: boolean;
}

// ============ 服务实现 ============

class AudioRecorderService {
  private state: RecordingState = 'idle';
  private eventEmitter: NativeEventEmitter | null = null;
  private progressSubscription: any = null;
  private onProgressCallback: ((progress: RecordingProgress) => void) | null = null;

  constructor() {
    // 只在 Android 上初始化事件监听
    if (Platform.OS === 'android' && AudioRecorderModule) {
      try {
        this.eventEmitter = new NativeEventEmitter(AudioRecorderModule);
      } catch (e) {
        console.warn('⚠️ [AudioRecorder] Failed to create event emitter:', e);
      }
    }
  }

  /**
   * 检查原生模块是否可用
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && AudioRecorderModule != null;
  }

  /**
   * 检查并请求麦克风权限
   */
  async checkPermission(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        return { granted, canAsk: true };
      }
      // iOS 暂不支持
      return { granted: false, canAsk: false };
    } catch (error) {
      console.error('❌ [AudioRecorder] Permission check failed:', error);
      return { granted: false, canAsk: false };
    }
  }

  /**
   * 请求麦克风权限
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '麦克风权限',
            message: '应用需要访问您的麦克风来录制语音消息',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return false;
    } catch (error) {
      console.error('❌ [AudioRecorder] Permission request failed:', error);
      return false;
    }
  }

  /**
   * 开始录音
   */
  async startRecording(
    onProgress?: (progress: RecordingProgress) => void
  ): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('语音录制功能在此平台不可用');
    }

    if (this.state === 'recording') {
      console.warn('⚠️ [AudioRecorder] Already recording');
      return;
    }

    // 检查权限
    const permission = await this.checkPermission();
    if (!permission.granted) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('麦克风权限被拒绝');
      }
    }

    try {
      console.log('🎙️ [AudioRecorder] Starting recording...');

      // 保存进度回调
      this.onProgressCallback = onProgress || null;

      // 设置进度监听
      if (this.eventEmitter && this.onProgressCallback) {
        this.progressSubscription = this.eventEmitter.addListener(
          'onRecordingProgress',
          (event: RecordingProgress) => {
            this.onProgressCallback?.(event);
          }
        );
      }

      // 调用原生模块开始录音
      await AudioRecorderModule.startRecording();
      this.state = 'recording';

      console.log('✅ [AudioRecorder] Recording started');
    } catch (error: any) {
      console.error('❌ [AudioRecorder] Start recording failed:', error);
      this.cleanupListeners();
      throw new Error(error.message || '开始录音失败');
    }
  }

  /**
   * 停止录音并获取结果
   */
  async stopRecording(): Promise<RecordingResult | null> {
    if (!this.isAvailable()) {
      return null;
    }

    if (this.state !== 'recording') {
      console.warn('⚠️ [AudioRecorder] Not recording');
      return null;
    }

    try {
      // 调用原生模块停止录音
      const result = await AudioRecorderModule.stopRecording();
      
      this.state = 'stopped';
      this.cleanupListeners();

      console.log('✅ [AudioRecorder] Recording result:', {
        duration: result.duration.toFixed(1) + 's',
        fileSize: (result.fileSize / 1024).toFixed(1) + 'KB',
        mimeType: result.mimeType,
      });

      // 重置状态
      this.state = 'idle';

      return result as RecordingResult;
    } catch (error: any) {
      console.error('❌ [AudioRecorder] Stop recording failed:', error);
      this.cleanupListeners();
      this.state = 'idle';
      throw new Error(error.message || '停止录音失败');
    }
  }

  /**
   * 取消录音（不保存）
   */
  async cancelRecording(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    if (this.state !== 'recording') {
      return;
    }

    try {
      await AudioRecorderModule.cancelRecording();
      console.log('🗑️ [AudioRecorder] Recording cancelled');
    } catch (error) {
      console.error('❌ [AudioRecorder] Cancel recording failed:', error);
    } finally {
      this.cleanupListeners();
      this.state = 'idle';
    }
  }

  /**
   * 清理事件监听
   */
  private cleanupListeners(): void {
    if (this.progressSubscription) {
      this.progressSubscription.remove();
      this.progressSubscription = null;
    }
    this.onProgressCallback = null;
  }

  /**
   * 获取当前录音状态
   */
  getState(): RecordingState {
    return this.state;
  }

  /**
   * 是否正在录音
   */
  isRecording(): boolean {
    return this.state === 'recording';
  }

  /**
   * 清理临时文件（由原生模块管理）
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [AudioRecorder] Cleanup completed');
  }
}

// 导出单例
export const audioRecorderService = new AudioRecorderService();

// 导出类型
export type { AudioRecorderService };
