import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type AudioPlayerNativeModule = {
  play: (filePath: string) => Promise<void>;
  stop: () => Promise<void>;
  isPlaying: () => Promise<boolean>;
  getCurrentPath: () => Promise<string | null>;
};

const { AudioPlayerModule } = NativeModules as { AudioPlayerModule?: AudioPlayerNativeModule };

class AudioPlayerService {
  private emitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'android' && AudioPlayerModule) {
      try {
        this.emitter = new NativeEventEmitter(NativeModules.AudioPlayerModule as any);
      } catch {
        this.emitter = null;
      }
    }
  }

  isAvailable(): boolean {
    return Platform.OS === 'android' && !!AudioPlayerModule;
  }

  private getUnavailableReason(): string {
    if (Platform.OS !== 'android') {
      return '音频播放目前仅支持 Android 平台';
    }

    // Android 但 NativeModules 没挂上来：通常是新增原生模块后没重装/没重新打包
    if (!AudioPlayerModule) {
      return 'AudioPlayer 原生模块未加载（通常是新增原生代码后未重新打包/重装 App）';
    }

    return '音频播放功能不可用';
  }

  async play(filePath: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error(this.getUnavailableReason());
    }
    if (!filePath) {
      throw new Error('无效的音频路径');
    }

    const normalized = filePath.startsWith('file://') ? filePath.replace('file://', '') : filePath;
    await AudioPlayerModule!.play(normalized);
  }

  async stop(): Promise<void> {
    if (!this.isAvailable()) return;
    await AudioPlayerModule!.stop();
  }

  async toggle(filePath: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error(this.getUnavailableReason());
    }

    const playing = await AudioPlayerModule!.isPlaying();
    const current = await AudioPlayerModule!.getCurrentPath();

    const normalized = filePath.startsWith('file://') ? filePath.replace('file://', '') : filePath;

    if (playing && current && current === normalized) {
      await AudioPlayerModule!.stop();
      return;
    }

    await AudioPlayerModule!.play(normalized);
  }

  onComplete(handler: () => void): (() => void) {
    if (!this.emitter) return () => {};
    const sub = this.emitter.addListener('onPlaybackComplete', handler);
    return () => sub.remove();
  }
}

export const audioPlayerService = new AudioPlayerService();
