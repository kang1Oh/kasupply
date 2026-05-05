const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseRetryAfterMilliseconds(value: string | null) {
  if (!value) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryDate = Date.parse(value);

  if (Number.isNaN(retryDate)) {
    return null;
  }

  return Math.max(0, retryDate - Date.now());
}

function getRetryDelayMilliseconds(attempt: number, retryAfterHeader: string | null) {
  const parsedRetryAfter = parseRetryAfterMilliseconds(retryAfterHeader);

  if (parsedRetryAfter !== null) {
    return parsedRetryAfter;
  }

  const baseDelay = 1500 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 400);
  return baseDelay + jitter;
}

export async function generateGeminiStructuredOutput<T>(params: {
  prompt: string;
  schema: Record<string, unknown>;
  inlineMedia?: Array<{
    mimeType: string;
    bytes: Buffer;
  }>;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const parts: Array<Record<string, unknown>> = [];

  for (const media of params.inlineMedia ?? []) {
    parts.push({
      inline_data: {
        mime_type: media.mimeType,
        data: media.bytes.toString("base64"),
      },
    });
  }

  parts.push({
    text: params.prompt,
  });

  let responseText = "";

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    const response = await fetch(GEMINI_GENERATE_CONTENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: params.schema,
        },
      }),
    });

    responseText = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseText) as GeminiGenerateContentResponse;
      const rawText = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");

      if (!rawText) {
        throw new Error("Gemini API did not return structured content.");
      }

      return {
        parsed: JSON.parse(rawText) as T,
        raw: data as Record<string, unknown>,
      };
    }

    const isRetryable = GEMINI_RETRYABLE_STATUS_CODES.has(response.status);

    console.error(
      `Gemini error on attempt ${attempt + 1}:`,
      response.status,
      responseText
    );

    if (!isRetryable || attempt === GEMINI_MAX_RETRIES) {
      throw new Error(`Gemini API request failed with status ${response.status}.`);
    }

    await sleep(
      getRetryDelayMilliseconds(attempt, response.headers.get("retry-after"))
    );
  }

  throw new Error("Gemini API request failed after retries.");
}
