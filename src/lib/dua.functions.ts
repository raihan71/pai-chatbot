import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { services } from "@/configs/api";

export interface DuaCard {
  id: number;
  group: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
  tags: string[];
}

const DUA_API_BASE = (services.dua || "localhost:8001").trim().replace(/\/+$/, "");
export const DUA_TOTAL = 227;

function getPayloadData(payload: unknown) {
  return (payload as { data?: unknown })?.data ?? payload;
}

function normalizeDuaCard(payload: unknown, fallbackId: number): DuaCard | null {
  const data = getPayloadData(payload);
  if (!data || typeof data !== "object") return null;

  const dua = data as Record<string, unknown>;
  const id = Number(dua.id ?? fallbackId);
  const group = typeof dua.grup === "string" ? dua.grup : "Doa harian";
  const title = typeof dua.nama === "string" ? dua.nama : `Doa ${id}`;
  const arabic = typeof dua.ar === "string" ? dua.ar : "";
  const transliteration = typeof dua.tr === "string" ? dua.tr : "";
  const translation = typeof dua.idn === "string" ? dua.idn : "";
  const tags = Array.isArray(dua.tag)
    ? dua.tag.filter((tag): tag is string => typeof tag === "string")
    : [];

  if (!arabic && !translation) return null;

  return {
    id: Number.isFinite(id) ? id : fallbackId,
    group,
    title,
    arabic: arabic || translation,
    transliteration,
    translation: translation || transliteration || arabic,
    source:
      typeof dua.tentang === "string" && dua.tentang.trim()
        ? dua.tentang
        : `${DUA_API_BASE}/api/doa/${Number.isFinite(id) ? id : fallbackId}`,
    tags,
  };
}

async function fetchDuaByNumber(duaNumber: number): Promise<DuaCard | null> {
  const duaRes = await fetch(`${DUA_API_BASE}/api/doa/${duaNumber}`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!duaRes.ok) return null;

  return normalizeDuaCard(await duaRes.json(), duaNumber);
}

export const getRandomDua = createServerFn({ method: "GET" }).handler(async () => {
  const duaNumber = Math.floor(Math.random() * 227) + 1;
  const card = await fetchDuaByNumber(duaNumber);
  if (card) return card;

  throw new Error("Failed to load dua");
});

export const getDuaByNumber = createServerFn({ method: "GET" })
  .inputValidator((d: { duaNumber?: number }) =>
    z
      .object({
        duaNumber: z.number().int().min(1).max(DUA_TOTAL),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const card = await fetchDuaByNumber(data.duaNumber);
    if (!card) {
      throw new Error("Failed to load dua");
    }

    return card;
  });
