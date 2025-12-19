package com.ledgeraiclient.audio

import android.media.MediaPlayer
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File

/**
 * 音频播放原生模块（Android）
 * 
 * 支持：
 * - play(filePath)
 * - stop()
 * - isPlaying()
 * - getCurrentPath()
 * - 播放完成事件：onPlaybackComplete
 */
class AudioPlayerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "AudioPlayerModule"
        private const val MODULE_NAME = "AudioPlayerModule"
        private const val EVENT_COMPLETE = "onPlaybackComplete"
    }

    private var mediaPlayer: MediaPlayer? = null
    private var currentPath: String? = null

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun play(filePath: String, promise: Promise) {
        try {
            if (filePath.isBlank()) {
                promise.reject("INVALID_PATH", "Empty file path")
                return
            }

            val f = File(filePath)
            if (!f.exists()) {
                promise.reject("FILE_NOT_FOUND", "Audio file not found: $filePath")
                return
            }

            stopInternal()

            val player = MediaPlayer()
            mediaPlayer = player
            currentPath = filePath

            player.setDataSource(filePath)
            player.setOnCompletionListener {
                Log.d(TAG, "Playback complete: $filePath")
                sendEvent(EVENT_COMPLETE, null)
                stopInternal()
            }
            player.setOnErrorListener { _, what, extra ->
                Log.e(TAG, "Playback error what=$what extra=$extra")
                stopInternal()
                true
            }

            player.prepare()
            player.start()

            Log.d(TAG, "Playing: $filePath")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play", e)
            stopInternal()
            promise.reject("PLAY_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        stopInternal()
        promise.resolve(null)
    }

    @ReactMethod
    fun isPlaying(promise: Promise) {
        val playing = mediaPlayer?.isPlaying ?: false
        promise.resolve(playing)
    }

    @ReactMethod
    fun getCurrentPath(promise: Promise) {
        promise.resolve(currentPath)
    }

    /**
     * 添加事件监听器（NativeEventEmitter 需要）
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // JS 端管理
    }

    /**
     * 移除事件监听器（NativeEventEmitter 需要）
     */
    @ReactMethod
    fun removeListeners(count: Int) {
        // JS 端管理
    }

    private fun stopInternal() {
        try {
            mediaPlayer?.let {
                try {
                    if (it.isPlaying) {
                        it.stop()
                    }
                } catch (_: Exception) {
                    // ignore
                }
                it.release()
            }
        } catch (_: Exception) {
            // ignore
        } finally {
            mediaPlayer = null
            currentPath = null
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
