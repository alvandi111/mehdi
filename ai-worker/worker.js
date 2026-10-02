const SPEECH_MODEL = "gemini-3.5-transcribe";

const corsHeaders = origin => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin"
});

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function allowedOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  return origin === "https://alvandi111.github.io"
    ? origin
    : "https://alvandi111.github.io";
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(binary);
}

async function callGroq(path, init, env) {
  const response = await fetch(`https://api.groq.com/openai/v1${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    }
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Groq ${response.status}: ${body.slice(0, 300)}`);
  }
  return JSON.parse(body);
}

async function transcribe(request, env, origin) {
  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return json({ error: "audio_file_required" }, 400, origin);
  }
  if (!env.GEMINI_API_KEY) {
    return json({ error: "gemini_not_configured" }, 503, origin);
  }
  if (!file.size || file.size > 12 * 1024 * 1024) {
    return json({ error: "invalid_audio_size" }, 413, origin);
  }
  const payload = {
    model: SPEECH_MODEL,
    store: false,
    input: [{
      type: "audio",
      mime_type: file.type || "audio/wav",
      data: toBase64(await file.arrayBuffer())
    }]
  };
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000)
    }
  );
  const raw = await response.text();
  let result;
  try { result = JSON.parse(raw); }
  catch { throw new Error(`Gemini ${response.status}: invalid_json_response`); }
  if (!response.ok || result.error) {
    const message = String(result.error?.message || result.error?.code || "request_rejected")
      .split(env.GEMINI_API_KEY).join("[hidden]");
    throw new Error(`Gemini ${response.status}: ${message.slice(0, 200)}`);
  }
  // REST returns text inside model_output steps; output_text is an SDK helper.
  const text = (result.steps || [])
    .filter(step => step.type === "model_output")
    .flatMap(step => step.content || [])
    .filter(content => content.type === "text" && typeof content.text === "string")
    .map(content => content.text).join("").trim();
  if (result.status && result.status !== "completed") {
    throw new Error(`gemini_transcription_${String(result.status).replace(/[^a-z_]/g, "")}`);
  }
  if (!text) {
    // Report only schema/status metadata, never the uploaded audio or key.
    const stepTypes = (result.steps || []).map(step => String(step.type)).join(",");
    throw new Error(`gemini_empty_transcription; status=${result.status || "unknown"}; steps=${stepTypes || "none"}`);
  }
  return json({ text, model: SPEECH_MODEL, language: "fa" }, 200, origin);
}

async function readReceipt(request, env, origin) {
  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return json({ error: "image_file_required" }, 400, origin);
  }
  if (file.size > 12 * 1024 * 1024) {
    return json({ error: "image_too_large" }, 413, origin);
  }
  const base64 = toBase64(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;
  const payload = {
    model: "qwen/qwen3.8-27b",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: [{
        type: "text",
        text: `این تصویر یک رسید یا سند مالی فارسی است.
فقط اطلاعات واقعاً موجود در تصویر را استخراج کن.
خروجی فقط JSON معتبر با کلیدهای زیر باشد:
origin
destination
amount_toman
date_jalali
description

مبدأ و مقصد حساب را جدا کن.
مبلغ را عدد صحیح به تومان برگردان.
اگر مبلغ ریال است آن را بر ۱۰ تقسیم کن.
اعداد فارسی و عربی را دقیق بخوان.
شرح کوتاه و قابل‌فهم باشد.
اگر اطلاعاتی مشخص نیست، رشته خالی یا صفر قرار بده.
هیچ توضیح اضافه‌ای ننویس.`
      }, {
        type: "image_url",
        image_url: { url: dataUrl }
      }]
    }]
  };
  const result = await callGroq(
    "/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    },
    env
  );
  const raw = result.choices?.[0]?.message?.content || "{}";
  let fields = {};
  try { fields = JSON.parse(raw); } catch {}
  return json({
    origin: String(fields.origin || ""),
    destination: String(fields.destination || ""),
    amount: Number(fields.amount_toman || 0),
    date: String(fields.date_jalali || ""),
    note: String(fields.description || "")
  }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: !!env.GEMINI_API_KEY, version: "61-interactions", model: SPEECH_MODEL, language: "fa" }, 200, origin);
      }
      if (request.method === "POST" && url.pathname === "/transcribe") {
        return await transcribe(request, env, origin);
      }
      if (request.method === "POST" && url.pathname === "/receipt") {
        if (!env.GROQ_API_KEY) return json({ error: "receipt_not_configured" }, 503, origin);
        return await readReceipt(request, env, origin);
      }
      return json({ error: "not_found" }, 404, origin);
    } catch (error) {
      return json({
        error: "ai_request_failed",
        detail: String(error.message || error).slice(0, 300)
      }, 502, origin);
    }
  }
};
