type OpenAiChatMessage = {
  role: "system" | "user";
  content: string;
};

type OpenAiJsonSchema = {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
};

type OpenAiStructuredOutputParams = {
  messages: OpenAiChatMessage[];
  jsonSchema: OpenAiJsonSchema;
  timeoutMs?: number;
  /** Optional Responses API tools (e.g. web search). Omit for plain structured JSON. */
  tools?: Array<Record<string, unknown>>;
  /** Retries on timeout, 5xx/429, empty body, or JSON parse failure (default 3). */
  maxAttempts?: number;
};

type OpenAiStructuredOutputResult<T> = {
  ok: true;
  data: T;
  model: string;
} | {
  ok: false;
  error: string;
  model: string;
};

const OPENAI_API_BASE = "https://api.openai.com/v1";

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    role?: string;
    content?: Array<{
      type?: string;
      text?: string;
      json?: unknown;
    }>;
  }>;
};

export function openAiWebSearchEnabled(): boolean {
  const v = process.env.OPENAI_ENABLE_WEB_SEARCH?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function collectTextFromResponsePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as ResponsesApiPayload;
  if (typeof p.output_text === "string" && p.output_text.trim()) return p.output_text.trim();
  const out = Array.isArray(p.output) ? p.output : [];
  const chunks: string[] = [];
  for (const item of out) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const c of content) {
      if (c && typeof c === "object" && typeof c.text === "string" && c.text.trim()) {
        chunks.push(c.text.trim());
      }
    }
  }
  return chunks.join("\n\n").trim();
}

/**
 * Responses API without JSON schema — for web search / research step.
 */
export async function openAiResponsesPlainText(params: {
  instructions?: string;
  input: string;
  tools?: Array<Record<string, unknown>>;
  timeoutMs?: number;
  /** Default 3 — web search can be slow; retries on transient errors. */
  maxAttempts?: number;
}): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string; model: string }> {
  const apiKey = getEnvApiKey();
  const model = getModel();
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not set", model };
  }

  const maxAttempts = Math.min(5, Math.max(1, params.maxAttempts ?? 3));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutMs = getTimeoutMs(params.timeoutMs) + (attempt - 1) * 20_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body: Record<string, unknown> = {
        model,
        input: params.input,
      };
      if (params.instructions) body.instructions = params.instructions;
      if (params.tools?.length) body.tools = params.tools;

      const res = await fetch(`${OPENAI_API_BASE}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        let bodyText = "";
        try {
          bodyText = await res.text();
        } catch {
          /* ignore */
        }
        if (attempt < maxAttempts && isRetriableHttpStatus(res.status)) {
          await sleepMs(800 * attempt);
          continue;
        }
        return {
          ok: false,
          error: `OpenAI HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 280)}` : ""}`,
          model,
        };
      }
      const json = (await res.json()) as unknown;
      const text = collectTextFromResponsePayload(json);
      if (!text) {
        if (attempt < maxAttempts) {
          await sleepMs(600 * attempt);
          continue;
        }
        return { ok: false, error: "OpenAI returned empty research text", model };
      }
      return { ok: true, text, model };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const aborted = msg.toLowerCase().includes("aborted");
      if (attempt < maxAttempts && aborted) {
        await sleepMs(1_000 * attempt);
        continue;
      }
      return { ok: false, error: `OpenAI request failed: ${msg}`, model };
    } finally {
      clearTimeout(timeout);
    }
  }
  return { ok: false, error: "OpenAI request failed after retries", model };
}

function getEnvApiKey(): string | undefined {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k ? k : undefined;
}

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
}

function getTimeoutMs(override?: number): number {
  if (override && Number.isFinite(override) && override > 0) return override;
  const envMs = Number(process.env.OPENAI_TIMEOUT_MS || "");
  if (Number.isFinite(envMs) && envMs > 0) return envMs;
  return 45_000;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** HTTP statuses where a brief retry often helps (transient capacity / rate limits). */
function isRetriableHttpStatus(status: number): boolean {
  return status >= 500 || status === 429 || status === 408;
}

/** Model sometimes wraps JSON in ```json fences despite schema format. */
function stripJsonFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  }
  return s;
}

function extractResponseText(payload: ResponsesApiPayload): string | undefined {
  const direct = payload.output_text?.trim();
  if (direct) return direct;

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string" && c.text.trim()) return c.text.trim();
      if (c?.json !== undefined) {
        try {
          return JSON.stringify(c.json);
        } catch {
          /* ignore */
        }
      }
    }
  }
  return undefined;
}

/**
 * Calls OpenAI Responses API with strict JSON schema output.
 * Returns a best-effort result object instead of throwing.
 */
export async function openAiStructuredOutput<T>(
  params: OpenAiStructuredOutputParams,
): Promise<OpenAiStructuredOutputResult<T>> {
  const apiKey = getEnvApiKey();
  const model = getModel();
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not set", model };
  }

  // Playground: "Developer message" + user chat ≈ `instructions` + `input` (string user turn).
  // See https://platform.openai.com/docs/api-reference/responses/create — prefer this over
  // a single lumped "SYSTEM:… USER:…" string, which is harder for the model to treat as hierarchy.
  const systemParts = params.messages.filter((m) => m.role === "system").map((m) => m.content.trim());
  const userParts = params.messages.filter((m) => m.role === "user").map((m) => m.content.trim());
  const instructions = systemParts.length ? systemParts.join("\n\n") : undefined;
  const userInput = userParts.length ? userParts.join("\n\n") : "";
  if (!userInput) {
    return { ok: false, error: "OpenAI: no user message content", model };
  }

  const maxAttempts = Math.min(5, Math.max(1, params.maxAttempts ?? 3));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    // Extra time on later attempts: large product JSON + schema can exceed default client timeouts.
    const timeoutMs = getTimeoutMs(params.timeoutMs) + (attempt - 1) * 30_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${OPENAI_API_BASE}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          ...(instructions ? { instructions } : {}),
          input: userInput,
          ...(params.tools?.length ? { tools: params.tools } : {}),
          text: {
            format: {
              type: "json_schema",
              name: params.jsonSchema.name,
              strict: params.jsonSchema.strict,
              schema: params.jsonSchema.schema,
            },
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let bodyText = "";
        try {
          bodyText = await res.text();
        } catch {
          /* ignore */
        }
        if (attempt < maxAttempts && isRetriableHttpStatus(res.status)) {
          await sleepMs(1_000 * attempt);
          continue;
        }
        return {
          ok: false,
          error: `OpenAI HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 280)}` : ""}`,
          model,
        };
      }

      const json = await res.json() as ResponsesApiPayload;
      const content = extractResponseText(json);
      if (!content) {
        if (attempt < maxAttempts) {
          await sleepMs(1_200 * attempt);
          continue;
        }
        let payloadPreview = "";
        try {
          payloadPreview = JSON.stringify(json).slice(0, 600);
        } catch {
          /* ignore */
        }
        return {
          ok: false,
          error: `OpenAI returned empty content${payloadPreview ? ` (payload: ${payloadPreview})` : ""}`,
          model,
        };
      }

      const cleaned = stripJsonFences(content);
      try {
        const parsed = JSON.parse(cleaned) as T;
        return { ok: true, data: parsed, model };
      } catch {
        if (attempt < maxAttempts) {
          await sleepMs(1_200 * attempt);
          continue;
        }
        return {
          ok: false,
          error: `OpenAI returned non-JSON output: ${cleaned.slice(0, 240)}`,
          model,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const aborted = msg.toLowerCase().includes("aborted");
      if (attempt < maxAttempts && aborted) {
        await sleepMs(1_200 * attempt);
        continue;
      }
      return { ok: false, error: `OpenAI request failed: ${msg}`, model };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false, error: "OpenAI request failed after retries", model };
}

