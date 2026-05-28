export type ChatContentMode = "hadith" | "dua";

export const CHAT_CONTENT_MODE_KEY = "smm_chat_content_mode";
export const HADITH_BOOK_KEY = "smm_hadith_book";

export const DEFAULT_CHAT_CONTENT_MODE: ChatContentMode = "hadith";
export const DEFAULT_HADITH_BOOK = "bukhari";

export const FALLBACK_HADITH_BOOKS = [
  { id: "bukhari", name: "HR. Bukhari" },
  { id: "muslim", name: "HR. Muslim" },
  { id: "abu-daud", name: "HR. Abu Daud" },
  { id: "tirmidzi", name: "HR. Tirmidzi" },
  { id: "nasai", name: "HR. Nasai" },
  { id: "ibnu-majah", name: "HR. Ibnu Majah" },
  { id: "malik", name: "HR. Malik" },
  { id: "ahmad", name: "HR. Ahmad" },
  { id: "darimi", name: "HR. Darimi" },
] as const;

function readStorage(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
}

export function readChatContentMode(): ChatContentMode {
  const value = readStorage(CHAT_CONTENT_MODE_KEY, DEFAULT_CHAT_CONTENT_MODE);
  return value === "dua" ? "dua" : "hadith";
}

export function readHadithBook(): string {
  return readStorage(HADITH_BOOK_KEY, DEFAULT_HADITH_BOOK).trim().toLowerCase();
}

export function writeChatContentMode(mode: ChatContentMode) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CHAT_CONTENT_MODE_KEY, mode);
  }
}

export function writeHadithBook(bookId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(HADITH_BOOK_KEY, bookId.trim().toLowerCase());
  }
}
