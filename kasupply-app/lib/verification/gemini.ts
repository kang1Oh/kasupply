const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

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

  if (!response.ok) {
    throw new Error(`Gemini API request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const rawText = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");

  if (!rawText) {
    throw new Error("Gemini API did not return structured content.");
  }

  return {
    parsed: JSON.parse(rawText) as T,
    raw: data as Record<string, unknown>,
  };
}
