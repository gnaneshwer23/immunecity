import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.ts";

/** Lovable AI gateway (requires LOVABLE_API_KEY + gateway base URL). */
export function createResponsesCall(
  request: Request,
  config: { baseURL: string; apiKey: string; model: string },
  messages: ModelMessage[],
  system?: string,
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: `${config.baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`,
    apiKey: config.apiKey,
    headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(config.model),
    ...(system ? { system } : {}),
    messages,
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return {
    result,
    response: () =>
      withLovableAiGatewayRunIdHeader(result.toUIMessageStreamResponse({ sendReasoning: true }), runIdFetch),
  };
}

/**
 * Direct OpenAI Responses API — intentional BYOK fallback when LOVABLE_API_KEY is absent.
 * Accepts OPENAI_API_KEY or the common mis-name OPEN_API_KEY.
 * Omits Lovable gateway headers and encrypted-reasoning options (stock OpenAI rejects those).
 */
export function createOpenAIDirectCall(
  request: Request,
  config: { apiKey: string; model: string },
  messages: ModelMessage[],
  system?: string,
) {
  // BYOK: provider key is read only from server env (never Vite/client).
  const provider = createOpenAI({ apiKey: config.apiKey });
  const result = streamText({
    model: provider.responses(config.model),
    ...(system ? { system } : {}),
    messages,
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
      },
    },
  });
  return {
    result,
    response: () => result.toUIMessageStreamResponse({ sendReasoning: true }),
  };
}
