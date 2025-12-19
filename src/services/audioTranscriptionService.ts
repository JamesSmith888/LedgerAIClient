export type AudioTranscriptionConfig = {
  baseURL: string;
  apiKey: string;
  /** Local file uri (prefer `file://...`) */
  fileUri: string;
  /** MIME type for the uploaded file (e.g. audio/mp4, audio/aac) */
  mimeType?: string;
  /** File name for multipart upload */
  fileName?: string;
  /** Transcription model name for OpenAI-compatible gateways (default: whisper-1) */
  model?: string;
  /** Optional language hint, e.g. zh */
  language?: string;
};

export type AudioTranscriptionResult = {
  text: string;
  raw?: unknown;
};

function normalizeBaseURL(baseURL: string): string {
  return (baseURL || '').trim().replace(/\/+$/, '');
}

function inferFileName(fileUri: string): string {
  const cleaned = (fileUri || '').split('?')[0];
  const parts = cleaned.split('/');
  const last = parts[parts.length - 1];
  return last && last.includes('.') ? last : `audio_${Date.now()}.m4a`;
}

function guessMimeType(fileName: string, fallback?: string): string {
  if (fallback) return fallback;
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/mp4';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  return 'application/octet-stream';
}

/**
 * OpenAI-compatible audio transcription.
 *
 * Expected endpoint: POST {baseURL}/v1/audio/transcriptions (multipart/form-data)
 * Typical response: { text: "..." }
 */
export async function transcribeAudioOpenAICompatible(
  config: AudioTranscriptionConfig
): Promise<AudioTranscriptionResult> {
  const baseURL = normalizeBaseURL(config.baseURL);
  const apiKey = (config.apiKey || '').trim();
  const fileUri = (config.fileUri || '').trim();

  if (!baseURL) {
    throw new Error('Base URL 不能为空');
  }
  if (!apiKey) {
    throw new Error('API Key 不能为空');
  }
  if (!fileUri) {
    throw new Error('无效的音频文件路径');
  }

  const url = `${baseURL}/v1/audio/transcriptions`;
  const fileName = config.fileName || inferFileName(fileUri);
  const mimeType = guessMimeType(fileName, config.mimeType);
  const model = (config.model || 'whisper-1').trim();

  // RN fetch + FormData: do NOT manually set multipart boundary.
  const form = new FormData();
  form.append('model', model);
  if (config.language) form.append('language', config.language);

  const normalizedUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
  form.append('file', {
    uri: normalizedUri,
    name: fileName,
    type: mimeType,
  } as any);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form as any,
  });

  const contentType = resp.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await resp.json() : await resp.text();

  if (!resp.ok) {
    const msg = typeof data === 'string' ? data : (data as any)?.error?.message || JSON.stringify(data);
    throw new Error(`转写失败 (${resp.status}): ${msg}`);
  }

  const text = (data as any)?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('转写返回为空');
  }

  return { text: text.trim(), raw: data };
}
