type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
};

type GeminiCandidate = {
  content?: {
    role?: string;
    parts?: GeminiPart[];
  };
};

type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
};

export type GeminiAudioTranscribeParams = {
  /** Model name, e.g. gemini-3-flash-preview */
  model: string;
  /** Base64 audio payload (raw base64, or data:...;base64,...) */
  base64: string;
  /** MIME type, e.g. audio/aac, audio/mp4 */
  mimeType: string;
  /** Prompt to instruct transcription */
  prompt?: string;
  /** Optional max output tokens */
  maxOutputTokens?: number;
};

function normalizeBase64(base64: string): string {
  const b = (base64 || '').trim();
  if (!b) return b;
  if (b.startsWith('data:')) {
    const idx = b.indexOf('base64,');
    return idx >= 0 ? b.slice(idx + 'base64,'.length) : b;
  }
  return b;
}

function normalizeBaseURL(baseURL: string): string {
  return (baseURL || '').trim().replace(/\/+$/, '');
}

function extractText(resp: GeminiGenerateContentResponse): string {
  const parts = resp?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (typeof part?.text === 'string' && part.text.trim()) {
      return part.text.trim();
    }
  }
  return '';
}

/**
 * Use official Gemini API endpoint.
 * POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=API_KEY
 */
export async function transcribeAudioWithGeminiOfficial(params: GeminiAudioTranscribeParams & { apiKey: string }): Promise<string> {
  const apiKey = (params.apiKey || '').trim();
  if (!apiKey) throw new Error('Gemini API Key 为空');

  const model = (params.model || '').trim();
  if (!model) throw new Error('Gemini 模型名为空');

  const data = normalizeBase64(params.base64);
  if (!data) throw new Error('音频 Base64 为空');

  const mimeType = (params.mimeType || '').trim();
  if (!mimeType) throw new Error('音频 mimeType 为空');

  const prompt = params.prompt || '请将这段语音转写成文字，只输出转写文本。';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: params.maxOutputTokens ?? 512,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await resp.json()) as GeminiGenerateContentResponse & { error?: any };
  if (!resp.ok) {
    const msg = json?.error?.message || JSON.stringify(json);
    throw new Error(`Gemini 转写失败 (${resp.status}): ${msg}`);
  }

  const text = extractText(json);
  if (!text) throw new Error('Gemini 转写返回为空');
  return text;
}

/**
 * Use NewAPI native Gemini endpoint.
 * POST {baseURL}/v1beta/models/{model}:generateContent
 * Authorization: Bearer {apiKey}
 */
export async function transcribeAudioWithGeminiViaNewAPI(
  params: GeminiAudioTranscribeParams & { baseURL: string; apiKey: string }
): Promise<string> {
  const baseURL = normalizeBaseURL(params.baseURL);
  const apiKey = (params.apiKey || '').trim();
  if (!baseURL) throw new Error('Base URL 不能为空');
  if (!apiKey) throw new Error('API Key 不能为空');

  const model = (params.model || '').trim();
  if (!model) throw new Error('Gemini 模型名为空');

  const data = normalizeBase64(params.base64);
  if (!data) throw new Error('音频 Base64 为空');

  const mimeType = (params.mimeType || '').trim();
  if (!mimeType) throw new Error('音频 mimeType 为空');

  const prompt = params.prompt || '请将这段语音转写成文字，只输出转写文本。';

  const url = `${baseURL}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  // Matches NewAPI schema: GeminiRequest.parts[].inlineData { mimeType, data }
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: params.maxOutputTokens ?? 512,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await resp.json()) as GeminiGenerateContentResponse & { error?: any };
  if (!resp.ok) {
    const msg = json?.error?.message || JSON.stringify(json);
    throw new Error(`NewAPI Gemini 转写失败 (${resp.status}): ${msg}`);
  }

  const text = extractText(json);
  if (!text) throw new Error('NewAPI Gemini 转写返回为空');
  return text;
}
