import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUserId } from "./clerk.server";
import { auth } from "@clerk/tanstack-react-start/server";
import {
  getAnthropic,
  buildSystemPrompt,
  getCitationHostname,
  getCitationUrlForMessage,
} from "./anthropic.server";
import { defluffForClaude } from "./defluffer";
import { createMimoMessage } from "./xiaomi-mimo.server";
import { createOpenRouterMessage } from "./openrouter.server";
import {
  getUsage,
  incrementUsage,
  listUserMessages,
  listSessionMessages,
  saveMessage,
  type SavedMessage,
} from "./contentful.server";
export interface ThreadSummary {
  sessionId: string;
  title: string;
  lastAt: string;
}

function collectCitationSource(citation: unknown): string | null {
  if (!citation || typeof citation !== "object") return null;
  const data = citation as Record<string, unknown>;
  const url = typeof data.url === "string" ? data.url.trim() : "";
  const source = typeof data.source === "string" ? data.source.trim() : "";
  return url || source || null;
}

function appendCitationSources(text: string, sources: Set<string>) {
  const sourceList = [...sources].filter((source) => source && !text.includes(source));
  if (sourceList.length === 0) return text;

  const label = sourceList.length === 1 ? "Sumber" : "Sumber";
  return `${text.trim()}\n\n${label}: ${sourceList.join(", ")}`;
}

function shouldFetchCitationSource(message: string) {
  const normalized = message.toLowerCase();
  return [
    "url",
    "link",
    "citation",
    "cite",
    "sumber",
    "kampus",
    "universitas",
    "university",
    "stitalazami",
    "al azami",
    "alazami",
    "pmb",
    "registrasi",
    "pendaftaran",
    "akademik",
    "prodi",
    "program studi",
    "biaya",
    "beasiswa",
    "jadwal",
    "fakultas",
    "dosen",
    "alamat",
    "telepon",
    "whatsapp",
    "kontak",
  ].some((keyword) => normalized.includes(keyword));
}

function withCitationFetchHint(
  message: string,
  selectedCitationUrl: string | null,
  toolName = "web_fetch",
) {
  if (!selectedCitationUrl || !shouldFetchCitationSource(message)) return message;

  return `${message}

[Instruksi internal: sebelum menjawab, gunakan ${toolName} untuk mengambil informasi terbaru dari halaman resmi universitas yang paling relevan ini: ${selectedCitationUrl}. Jawab berdasarkan hasil pencarian dan cantumkan sumbernya.]`;
}

function getCompanyAiProvider() {
  return (import.meta.env.VITE_COMPANY_AI || "anthropic").trim().toLowerCase();
}

function shouldUseAnthropic() {
  return getCompanyAiProvider() === "anthropic";
}

function shouldUseOpenRouter() {
  return getCompanyAiProvider() === "openrouter";
}

function getProviderLabel() {
  const provider = getCompanyAiProvider();
  if (provider === "anthropic") return "Claude";
  if (provider === "openrouter") return "OpenRouter";
  return "MiMo";
}

export const getThreads = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const all = await listUserMessages(userId);
  const map = new Map<string, ThreadSummary>();
  for (const m of all) {
    const existing = map.get(m.sessionId);
    if (!existing || m.createdAt > existing.lastAt) {
      map.set(m.sessionId, {
        sessionId: m.sessionId,
        title: existing?.title || m.sessionTitle || "Percakapan",
        lastAt: m.createdAt,
      });
    } else if (!existing.title && m.sessionTitle) {
      existing.title = m.sessionTitle;
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
});

export const getThread = createServerFn({ method: "GET" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const messages = await listSessionMessages(userId, data.sessionId);
    return { messages };
  });

export const getUsageInfo = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return await getUsage(userId);
});

const SendInput = z.object({
  sessionId: z.string().min(1).max(64),
  message: z.string().trim().min(1).max(2000),
  style: z.enum(["ringkas", "detail", "praktis"]).default("praktis"),
});

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SendInput.parse(d))
  .handler(async ({ data }) => {
    const a = await auth();
    if (!a.userId) throw new Error("Unauthorized");
    const userId = a.userId;
    const userEmail = (a.sessionClaims as { email?: string } | null)?.email;

    // Check limit BEFORE calling the configured AI provider.
    const usage = await getUsage(userId);
    if (usage.totalQuestions >= usage.limit) {
      return {
        ok: false as const,
        error: "limit",
        usage,
      };
    }

    // Load prior messages in this session for context
    const prior = await listSessionMessages(userId, data.sessionId);
    const nextOrder = prior.length;

    // Determine session title from first message
    const sessionTitle =
      prior.find((m) => m.role === "user")?.content?.slice(0, 60) ?? data.message.slice(0, 60);

    // Save user message first
    const userMsg = await saveMessage({
      userId,
      userEmail,
      sessionId: data.sessionId,
      sessionTitle,
      role: "user",
      content: data.message,
      messageOrder: nextOrder,
    });

    // Build compact outbound context. Persisted chat content stays unchanged.
    const selectedCitationUrl = getCitationUrlForMessage(data.message);
    const useAnthropic = shouldUseAnthropic();
    const useOpenRouter = shouldUseOpenRouter();
    const rawMessages = [
      ...prior.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user" as const,
        content: useAnthropic
          ? withCitationFetchHint(data.message, selectedCitationUrl)
          : useOpenRouter
            ? withCitationFetchHint(data.message, selectedCitationUrl, "web_search")
            : data.message,
      },
    ];
    const aiMessages = rawMessages.map((m) => ({
      ...m,
      content: defluffForClaude(m.content).text,
    }));

    let assistantText = "";
    try {
      const systemPrompt = defluffForClaude(buildSystemPrompt(data.style)).text;
      const citationHostname = getCitationHostname();
      const forceCitationFetch = shouldFetchCitationSource(data.message) && !!citationHostname;
      const citationTools = citationHostname
        ? [
            {
              type: "web_fetch_20260309" as const,
              name: "web_fetch" as const,
              allowed_callers: ["direct" as const],
              allowed_domains: [citationHostname],
              citations: { enabled: true },
              max_uses: 2,
              max_content_tokens: 8000,
            },
          ]
        : undefined;
      const openRouterCitationTools =
        forceCitationFetch && citationHostname
          ? [
              {
                type: "openrouter:web_search" as const,
                parameters: {
                  allowedDomains: [citationHostname],
                  maxResults: 3,
                  maxTotalResults: 3,
                },
              },
            ]
          : undefined;
      if (useAnthropic) {
        const client = getAnthropic();
        const resp = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: aiMessages,
          ...(citationTools ? { tools: citationTools } : {}),
          ...(forceCitationFetch
            ? {
                tool_choice: {
                  type: "tool" as const,
                  name: "web_fetch",
                  disable_parallel_tool_use: true,
                },
              }
            : {}),
        });
        const citationSources = new Set<string>();
        assistantText = resp.content
          .map((b) => {
            if (b.type !== "text") return "";
            for (const citation of b.citations ?? []) {
              const source = collectCitationSource(citation);
              if (source) citationSources.add(source);
            }
            return b.text;
          })
          .join("")
          .trim();
        assistantText = appendCitationSources(assistantText, citationSources);
      } else if (useOpenRouter) {
        const resp = await createOpenRouterMessage({
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: aiMessages,
          ...(openRouterCitationTools ? { tools: openRouterCitationTools } : {}),
          ...(forceCitationFetch
            ? {
                toolChoice: {
                  type: "openrouter:web_search",
                },
              }
            : {}),
          maxTokens: 1024,
        });
        assistantText = appendCitationSources(resp.text, resp.sources);
      } else {
        const resp = await createMimoMessage({
          system: systemPrompt,
          messages: aiMessages,
          maxTokens: 1024,
          enableUniversitySearch: shouldFetchCitationSource(data.message),
        });
        assistantText = resp.text;
      }

      if (!assistantText) assistantText = "Maaf, saya belum bisa menjawab saat ini. Coba lagi ya.";
    } catch (err) {
      console.error(`${getProviderLabel()} error`, err);
      // Do not increment usage; do not save assistant message
      return {
        ok: false as const,
        error: "ai_failed",
        usage,
      };
    }

    // Save assistant reply
    const assistantMsg = await saveMessage({
      userId,
      userEmail,
      sessionId: data.sessionId,
      sessionTitle,
      role: "assistant",
      content: assistantText,
      messageOrder: nextOrder + 1,
    });

    // Increment usage only after success
    const newUsage = await incrementUsage(userId, userEmail);

    return {
      ok: true as const,
      sessionTitle,
      userMessage: userMsg as SavedMessage,
      assistantMessage: assistantMsg as SavedMessage,
      usage: newUsage,
    };
  });
