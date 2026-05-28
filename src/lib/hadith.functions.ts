import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { services } from "@/configs/api";

export interface HadithCard {
  bookName: string;
  bookId: string;
  hadithNumber: number;
  arabic: string;
  translation: string;
  source: string;
}

export interface HadithBookOption {
  id: string;
  name: string;
  available?: number;
}

const HADITH_API_BASE = (services.hadith || "localhost:8000").trim().replace(/\/+$/, "");

function getPayloadData(payload: unknown) {
  return (payload as { data?: unknown })?.data ?? payload;
}

function normalizeHadithCard(
  payload: unknown,
  fallbackBookId: string,
  fallbackNumber: number,
): HadithCard | null {
  const data = getPayloadData(payload);
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

function normalizeHadithBook(payload: unknown): HadithBookOption[] {
  const data = getPayloadData(payload);
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const book = item as Record<string, unknown>;
      const id = typeof book.id === "string" ? book.id.trim().toLowerCase() : "";
      const name = typeof book.name === "string" ? book.name : id ? `HR. ${id}` : "";
      const available = Number(book.available);

      if (!id || !name) return null;

      return {
        id,
        name,
        available: Number.isFinite(available) ? available : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
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

export const getHadithBooks = createServerFn({ method: "GET" }).handler(async () => {
  const res = await fetch(`${HADITH_API_BASE}/books`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load hadith books");
  }

  return normalizeHadithBook(await res.json());
});

export const getHadithByNumber = createServerFn({ method: "GET" })
  .inputValidator((d: { bookId?: string; hadithNumber?: number }) =>
    z
      .object({
        bookId: z.string().min(1).default("bukhari"),
        hadithNumber: z.number().int().min(1),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const bookId = data.bookId.trim().toLowerCase() || "bukhari";
    const hadithNumber = data.hadithNumber;
    const card = await fetchHadithByNumber(bookId, hadithNumber);

    if (!card) {
      throw new Error("Failed to load hadith");
    }

    return card;
  });

export const getRandomHadith = createServerFn({ method: "GET" })
  .inputValidator((d: { bookId?: string }) =>
    z
      .object({
        bookId: z.string().min(1).default("bukhari"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const bookId = data.bookId.trim().toLowerCase() || "bukhari";
    const attempts = [Math.floor(Math.random() * 150) + 1, 1];

    for (const hadithNumber of attempts) {
      const card = await fetchHadithByNumber(bookId, hadithNumber);
      if (card) return card;
    }

    throw new Error("Failed to load hadith");
  });
