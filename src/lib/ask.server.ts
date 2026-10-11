import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { createOpenAIDirectCall, createResponsesCall } from "@/lib/ai/responses.server.ts";
import {
  ASK_DISABLED_MESSAGE,
  MAX_QUESTION_CHARS,
  SYSTEM,
  isAskEmergencyDisabled,
  prepareAsk,
  rateLimited,
} from "@/lib/askGrounding";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const LOVABLE_MODEL = "openai/gpt-6-astra";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

type AskProvider =
  | { kind: "lovable"; apiKey: string; model: string }
  | { kind: "openai"; apiKey: string; model: string };

function resolveAskProvider(env: NodeJS.ProcessEnv = process.env): AskProvider | null {
  const lovable = env["LOVABLE_API_KEY"]?.trim();
  if (lovable) return { kind: "lovable", apiKey: lovable, model: LOVABLE_MODEL };

  // Prefer OPENAI_API_KEY. OPEN_API_KEY kept temporarily for Vercel backward compat.
  const openai = env["OPENAI_API_KEY"]?.trim() || env["OPEN_API_KEY"]?.trim();
  if (openai) {
    const model = env["OPENAI_MODEL"]?.trim() || DEFAULT_OPENAI_MODEL;
    return { kind: "openai", apiKey: openai, model };
  }
  return null;
}

function textReply(text: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: "r" });
      writer.write({ type: "text-delta", id: "r", delta: text });
      writer.write({ type: "text-end", id: "r" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function handleAsk(request: Request): Promise<Response> {
  if (isAskEmergencyDisabled()) {
    return Response.json({ error: ASK_DISABLED_MESSAGE }, { status: 503, headers: { "Retry-After": "300" } });
  }

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) {
    return Response.json({ error: "Too many questions in a short time. Please wait a minute." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  let messages: UIMessage[];
  try {
    const body = await request.json();
    messages = body.messages;
    if (!Array.isArray(messages)) throw new Error("bad body");
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  messages = messages.slice(-10);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const question = lastUser?.parts?.filter((p) => p.type === "text").map((p) => p.text).join(" ") ?? "";
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json({ error: `Please keep questions under ${MAX_QUESTION_CHARS} characters.` }, { status: 400 });
  }

  // Abstentions (clinical, omics, unsupported) must work even when the model key is absent.
  const prepared = prepareAsk(question);
  if (!prepared.callModel && prepared.replyText) {
    return textReply(prepared.replyText);
  }

  const provider = resolveAskProvider();
  if (!provider) {
    return Response.json(
      {
        error:
          "AI is not configured for this app yet. Safe abstentions still work; grounded model answers require LOVABLE_API_KEY (Lovable gateway) or OPENAI_API_KEY (OpenAI Responses API).",
      },
      { status: 503 },
    );
  }

  const system =
    SYSTEM +
    prepared.grounding.text +
    `\n\nRESPONSE_TRACE prompt=${prepared.grounding.trace.promptVersion} graph=${prepared.grounding.trace.graphVersion} class=${prepared.queryClass}`;
  const modelMessages = await convertToModelMessages(messages);

  if (provider.kind === "lovable") {
    const { response } = createResponsesCall(
      request,
      { baseURL: GATEWAY_URL, apiKey: provider.apiKey, model: provider.model },
      modelMessages,
      system,
    );
    return response();
  }

  const { response } = createOpenAIDirectCall(
    request,
    { apiKey: provider.apiKey, model: provider.model },
    modelMessages,
    system,
  );
  return response();
}

/** Exported for unit tests — do not use from client code. */
export { resolveAskProvider };
