type ChatRole = "user" | "assistant";

export interface MimoChatMessage {
  role: ChatRole;
  content: string;
}

interface MimoTextBlock {
  type: "text";
  text: string;
}

interface MimoResponse {
  content?: Array<MimoTextBlock | Record<string, unknown>>;
}

const mimoUniversitySearchTool = {
  type: "web_search",
  max_keyword: 3,
  force_search: true,
  limit: 1,
  user_location: {
    type: "approximate",
    country: "Indonesia",
    region: "DKI Jakarta",
    city: "Jakarta Selatan",
  },
};

const MIMO_API_URL = process.env.MIMO_API_URL || "https://api.xiaomimimo.com/anthropic/v1/messages";
const MIMO_MODEL = process.env.MIMO_MODEL || "mimo-v2.5";

function getMimoApiKey() {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) throw new Error("MIMO_API_KEY is not configured");
  return apiKey;
}

function toMimoContent(text: string): MimoTextBlock[] {
  return [{ type: "text", text }];
}

export async function createMimoMessage({
  system,
  messages,
  maxTokens = 1024,
  enableUniversitySearch = false,
}: {
  system: string;
  messages: MimoChatMessage[];
  maxTokens?: number;
  enableUniversitySearch?: boolean;
}) {
  const response = await fetch(MIMO_API_URL, {
    method: "POST",
    headers: {
      "api-key": getMimoApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      max_tokens: maxTokens,
      system,
      messages: messages.map((message) => ({
        role: message.role,
        content: toMimoContent(message.content),
      })),
      top_p: 0.95,
      stream: false,
      temperature: 1.0,
      stop_sequences: null,
      ...(enableUniversitySearch ? { tools: [mimoUniversitySearchTool] } : {}),
      thinking: {
        type: "disabled",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`MiMo request failed: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as MimoResponse;
  const text =
    data.content
      ?.map((block) => (block.type === "text" && typeof block.text === "string" ? block.text : ""))
      .join("")
      .trim() || "";

  return { text };
}
