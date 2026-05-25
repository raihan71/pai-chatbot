import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUserId } from "./clerk.server";
import { getAnthropic, buildSystemPrompt } from "./anthropic.server";
import {
  getUsage,
  incrementUsage,
  listUserMessages,
  listSessionMessages,
  saveMessage,
  type SavedMessage,
} from "./contentful.server";
import { auth } from "@clerk/tanstack-react-start/server";

export interface ThreadSummary {
  sessionId: string;
  title: string;
  lastAt: string;
}

export interface HadithCard {
  bookName: string;
  bookId: string;
  hadithNumber: number;
  arabic: string;
  translation: string;
  source: string;
}

const HADITH_API_BASE = (import.meta.env.VITE_API_HADIST || "https://api.hadith.gading.dev").trim();

function normalizeHadithCard(
  payload: unknown,
  fallbackBookId: string,
  fallbackNumber: number,
): HadithCard | null {
  const data = (payload as { data?: unknown })?.data ?? payload;
  if (!data || typeof data !== "object") return null;

  const hadith = data as Record<string, unknown>;
  const bookName = typeof hadith.name === "string" ? hadith.name : `HR. ${fallbackBookId}`;
  const resolvedBookId = typeof hadith.id === "string" ? hadith.id : fallbackBookId;

  const contents =
    hadith.contents && typeof hadith.contents === "object"
      ? (hadith.contents as Record<string, unknown>)
      : null;

  const hadithNumber = Number(contents?.number ?? fallbackNumber);
  const arabic = typeof contents?.arab === "string" ? contents.arab : "";
  const translation = typeof contents?.id === "string" ? contents.id : "";

  if (!arabic && !translation) return null;

  const resolvedNumber = Number.isFinite(hadithNumber) ? hadithNumber : fallbackNumber;

  return {
    bookName,
    bookId: resolvedBookId,
    hadithNumber: resolvedNumber,
    arabic: arabic || translation,
    translation: translation || arabic,
    source: `${HADITH_API_BASE}/books/${resolvedBookId}/${resolvedNumber}`,
  };
}

async function fetchHadithByNumber(
  bookId: string,
  hadithNumber: number,
): Promise<HadithCard | null> {
  const hadithRes = await fetch(
    `${HADITH_API_BASE}/books/${encodeURIComponent(bookId)}/${hadithNumber}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!hadithRes.ok) return null;

  return normalizeHadithCard(await hadithRes.json(), bookId, hadithNumber);
}

export const getRandomHadith = createServerFn({ method: "GET" }).handler(async () => {
  const bookId = (import.meta.env.VITE_HADITH_HISTORY || "bukhari").trim().toLowerCase();
  const attempts = [Math.floor(Math.random() * 150) + 1, 1];

  for (const hadithNumber of attempts) {
    const card = await fetchHadithByNumber(bookId, hadithNumber);
    if (card) return card;
  }

  throw new Error("Failed to load hadith");
});

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

    // Check limit BEFORE calling Claude
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

    // Build context for Claude
    const claudeMessages = [
      ...prior.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: data.message },
    ];

    let assistantText = "";
    try {
      const client = getAnthropic();
      const resp = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: buildSystemPrompt(data.style),
        messages: claudeMessages,
      });
      assistantText = resp.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      if (!assistantText) assistantText = "Maaf, saya belum bisa menjawab saat ini. Coba lagi ya.";
    } catch (err) {
      console.error("Claude error", err);
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
