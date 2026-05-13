import {
  SEARCH_EMBEDDING_DIMENSION,
  SEARCH_EMBEDDING_MODEL,
} from "@/lib/search/constants";
import type { SearchEmbeddingTaskType } from "@/lib/search/types";

const GEMINI_EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${SEARCH_EMBEDDING_MODEL}:embedContent`;

type GeminiEmbeddingResponse = {
  embedding?: {
    values?: number[];
  };
};

function normalizeVector(values: number[]) {
  const magnitude = Math.sqrt(
    values.reduce((total, value) => total + value * value, 0)
  );

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("Gemini returned an invalid embedding magnitude.");
  }

  return values.map((value) => value / magnitude);
}

export function isSearchEmbeddingConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value).toString()).join(",")}]`;
}

export async function generateSearchEmbedding(params: {
  text: string;
  taskType: SearchEmbeddingTaskType;
  title?: string | null;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const text = params.text.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  if (!text) {
    throw new Error("Search embedding text cannot be empty.");
  }

  const response = await fetch(GEMINI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
      taskType: params.taskType,
      title:
        params.taskType === "RETRIEVAL_DOCUMENT" ? params.title?.trim() || undefined : undefined,
      outputDimensionality: SEARCH_EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini embedding request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as GeminiEmbeddingResponse;
  const values = data.embedding?.values ?? [];

  if (values.length !== SEARCH_EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected ${SEARCH_EMBEDDING_DIMENSION}-dimension embedding, received ${values.length}.`
    );
  }

  return normalizeVector(values);
}

