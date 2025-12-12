package com.ledgeraiclient.audio

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileInputStream

/**
 * 音频录制原生模块
 * 
 * 支持：
 * 1. 开始/停止录音
 * 2. 获取录音的 Base64 数据
 * 3. 录音进度回调
 */
class AudioRecorderModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "AudioRecorderModule"
        private const val MODULE_NAME = "AudioRecorderModule"
        private const val EVENT_PROGRESS = "onRecordingProgress"
    }

    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: String = ""
    private var isRecording = false
    private var startTime: Long = 0
    private var progressHandler: Handler? = null
    private var progressRunnable: Runnable? = null

    override fun getName(): String = MODULE_NAME

    /**
     * 检查麦克风权限
     */
    @ReactMethod
    fun checkPermission(promise: Promise) {
        val granted = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        
        promise.resolve(granted)
    }

    /**
     * 开始录音
     */
    @ReactMethod
    fun startRecording(promise: Promise) {
        if (isRecording) {
            promise.reject("ALREADY_RECORDING", "Already recording")
            return
        }

        // 检查权限
        if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "Microphone permission not granted")
            return
        }

        try {
            // 设置输出文件路径
            outputFile = "${reactContext.cacheDir}/voice_recording.m4a"
            
            // 删除旧文件
            File(outputFile).delete()

            // 创建 MediaRecorder
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder?.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128000)
                setAudioChannels(1)
                setOutputFile(outputFile)
                
                prepare()
                start()
            }

            isRecording = true
            startTime = System.currentTimeMillis()
            
            // 启动进度更新
            startProgressUpdates()

            Log.d(TAG, "Recording started: $outputFile")
            promise.resolve(outputFile)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start recording", e)
            cleanup()
            promise.reject("START_FAILED", e.message)
        }
    }

    /**
     * 停止录音并返回结果
     */
    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (!isRecording) {
            promise.reject("NOT_RECORDING", "Not currently recording")
            return
        }

        try {
            // 停止进度更新
            stopProgressUpdates()

            // 停止录音
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false

            // 计算时长
            val duration = (System.currentTimeMillis() - startTime) / 1000.0

            // 读取文件并转换为 Base64
            val file = File(outputFile)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Recording file not found")
                return
            }

            val bytes = FileInputStream(file).use { it.readBytes() }
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

            // 返回结果
            // 注意：虽然文件格式是 M4A（MPEG-4 容器），但音频编码是 AAC
            // Gemini API 只支持 audio/aac，不支持 audio/mp4
            val result = Arguments.createMap().apply {
                putString("filePath", outputFile)
                putDouble("duration", duration)
                putString("base64", base64)
                putString("mimeType", "audio/aac")
                putInt("fileSize", bytes.size)
            }

            Log.d(TAG, "Recording stopped: duration=${duration}s, size=${bytes.size}")
            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop recording", e)
            cleanup()
            promise.reject("STOP_FAILED", e.message)
        }
    }

    /**
     * 取消录音
     */
    @ReactMethod
    fun cancelRecording(promise: Promise) {
        try {
            stopProgressUpdates()
            
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false

            // 删除录音文件
            File(outputFile).delete()

            Log.d(TAG, "Recording cancelled")
            promise.resolve(null)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel recording", e)
            cleanup()
            promise.resolve(null) // 取消操作不抛出错误
        }
    }

    /**
     * 获取录音状态
     */
    @ReactMethod
    fun isRecording(promise: Promise) {
        promise.resolve(isRecording)
    }

    /**
     * 添加事件监听器（NativeEventEmitter 需要）
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // 由 JS 端管理监听器
    }

    /**
     * 移除事件监听器（NativeEventEmitter 需要）
     */
    @ReactMethod
    fun removeListeners(count: Int) {
        // 由 JS 端管理监听器
    }

    /**
     * 启动进度更新
     */
    private fun startProgressUpdates() {
        progressHandler = Handler(Looper.getMainLooper())
        progressRunnable = object : Runnable {
            override fun run() {
                if (isRecording) {
                    val currentPosition = System.currentTimeMillis() - startTime
                    
                    // 获取音量（模拟值，因为真实音量需要更复杂的处理）
                    val metering = 0.5 + Math.random() * 0.3
                    
                    val params = Arguments.createMap().apply {
                        putDouble("currentPosition", currentPosition.toDouble())
                        putDouble("currentMetering", metering)
                    }
                    
                    sendEvent(EVENT_PROGRESS, params)
                    progressHandler?.postDelayed(this, 100)
                }
            }
        }
        progressHandler?.post(progressRunnable!!)
    }

    /**
     * 停止进度更新
     */
    private fun stopProgressUpdates() {
        progressRunnable?.let { progressHandler?.removeCallbacks(it) }
        progressHandler = null
        progressRunnable = null
    }

    /**
     * 发送事件到 JS
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * 清理资源
     */
    private fun cleanup() {
        stopProgressUpdates()
        try {
            mediaRecorder?.release()
        } catch (e: Exception) {
            // 忽略
        }
        mediaRecorder = null
        isRecording = false
    }
}
