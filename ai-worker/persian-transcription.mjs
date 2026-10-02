// Server-only integration. Import this from the existing Worker's /transcribe
// handler; preserve its authentication, rate limits, CORS and receipt handler.
export const SPEECH_MODEL = 'whisper-large-v3';
export const SPEECH_LANGUAGE = 'fa';

export async function transcribePersianAudio(file, env, request = fetch) {
  if (!env.GROQ_API_KEY) throw new Error('speech_service_not_configured');
  if (!(file instanceof Blob) || file.size < 400 || file.size > 12 * 1024 * 1024 ||
      !/^audio\/(wav|x-wav|webm|mp4|mpeg|ogg|aac|flac)$/i.test(file.type)) {
    throw new Error('invalid_audio');
  }
  const form = new FormData();
  form.append('file', file, file.name || 'voice.wav');
  form.append('model', SPEECH_MODEL);
  form.append('language', SPEECH_LANGUAGE);
  form.append('temperature', '0');
  form.append('response_format', 'json');
  // No spelling substitutions, example sentences or instruction prompt.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await request('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: form,
      signal: controller.signal
    });
    // Do not expose upstream bodies or credentials to the browser.
    if (!response.ok) throw new Error(`speech_upstream_${response.status}`);
    const result = await response.json();
    if (typeof result.text !== 'string') throw new Error('invalid_speech_response');
    return { text: result.text, provider: 'groq', model: SPEECH_MODEL, language: SPEECH_LANGUAGE };
  } finally {
    clearTimeout(timer);
  }
}
