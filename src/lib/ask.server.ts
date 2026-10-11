import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { createResponsesCall } from "@/lib/ai/responses.server.ts";
import {
  ASK_DISABLED_MESSAGE,
  MAX_QUESTION_CHARS,
  SYSTEM,
  isAskEmergencyDisabled,
  prepareAsk,
  rateLimited,
} from "@/lib/askGrounding";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

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

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return Response.json(
      { error: "AI is not configured for this app yet. Safe abstentions still work; grounded model answers require LOVABLE_API_KEY." },
      { status: 503 },
    );
  }

  const system =
    SYSTEM +
    prepared.grounding.text +
    `\n\nRESPONSE_TRACE prompt=${prepared.grounding.trace.promptVersion} graph=${prepared.grounding.trace.graphVersion} class=${prepared.queryClass}`;
  const modelMessages = await convertToModelMessages(messages);
  const { response } = createResponsesCall(request, { baseURL: GATEWAY_URL, apiKey, model: MODEL }, modelMessages, system);
  return response();
}
