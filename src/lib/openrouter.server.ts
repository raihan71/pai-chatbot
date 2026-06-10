import { OpenRouter } from "@openrouter/sdk";
import type { ChatFunctionTool, ChatMessages, ChatToolChoice } from "@openrouter/sdk/models";

type ChatRole = "user" | "assistant";

export interface OpenRouterChatMessage {
  role: ChatRole;
  content: string;
}

interface OpenRouterMessageOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  system: any;
  messages: OpenRouterChatMessage[];
  maxTokens?: number;
  tools?: ChatFunctionTool[];
  toolChoice?: ChatToolChoice;
}

let client: OpenRouter | null = null;

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku";
const appName = import.meta.env.VITE_ENV_APPNAME || "Sahabat Muslim";

export function getOpenRouter(): OpenRouter {
  if (client) return client;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  client = new OpenRouter({
    apiKey,
    appTitle: appName,
  });

  return client;
}

function toOpenRouterMessages(system: string, messages: OpenRouterChatMessage[]): ChatMessages[] {
  return [
    {
      role: "system",
      content: system,
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const data = part as Record<string, unknown>;
      return data.type === "text" && typeof data.text === "string" ? data.text : "";
    })
    .join("");
}

function collectSources(value: unknown, sources: Set<string>) {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) collectSources(item, sources);
    return;
  }

  const data = value as Record<string, unknown>;
  const type = typeof data.type === "string" ? data.type : "";
  const url = typeof data.url === "string" ? data.url.trim() : "";
  const source = typeof data.source === "string" ? data.source.trim() : "";

  if (
    url &&
    (type === "url_citation" ||
      type === "web_search_result_location" ||
      type === "search_result_location" ||
      type === "url")
  ) {
    sources.add(url);
  }

  if (source && type.includes("citation")) {
    sources.add(source);
  }

  for (const key of ["annotations", "citations", "sources", "content", "output", "action"]) {
    collectSources(data[key], sources);
  }
}

export async function createOpenRouterMessage({
  system,
  messages,
  maxTokens = 1024,
  tools,
  toolChoice,
}: OpenRouterMessageOptions) {
  const response = await getOpenRouter().chat.send({
    chatRequest: {
      model: OPENROUTER_MODEL,
      maxTokens,
      messages: toOpenRouterMessages(system, messages),
      stream: false,
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { toolChoice } : {}),
    },
  });

  const message = response.choices[0]?.message;
  const sources = new Set<string>();
  collectSources(message, sources);
  collectSources(response.openrouterMetadata?.pipeline, sources);
  const text = extractText(message?.content).trim();

  return { text, sources };
}
