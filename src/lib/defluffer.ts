type Dictionaries = {
  phrases: Record<string, string>;
  synonyms: Record<string, string>;
  blacklist: string[];
};

type CompressionStats = {
  originalChars: number;
  compressedChars: number;
  savedChars: number;
  savedPercent: number;
};

export type DefluffedText = {
  text: string;
  stats: CompressionStats;
};

const DEFAULT_DICTIONARIES: Dictionaries = {
  phrases: {
    "mohon bantu saya untuk": "",
    "tolong bantu saya untuk": "",
    "tolong bantu untuk": "",
    "bisakah kamu": "",
    "apakah kamu bisa": "",
    "saya ingin bertanya tentang": "tanya:",
    "aku ingin bertanya tentang": "tanya:",
    "saya mau bertanya tentang": "tanya:",
    "aku mau bertanya tentang": "tanya:",
    "jelaskan kepada saya": "jelaskan",
    "berikan saya": "beri",
    "langkah demi langkah": "bertahap",
    "step by step": "bertahap",
    "secara umum": "umum",
    "pada saat ini": "saat ini",
    "untuk dapat": "untuk",
    "agar supaya": "agar",
    "di dalam": "dalam",
    "ke dalam": "ke",
    "oleh karena itu": "jadi",
    "akan tetapi": "tapi",
    "namun demikian": "namun",
    "yang bisa langsung dipraktikkan": "yang praktis",
    "pertanyaan menyangkut": "pertanyaan tentang",
    "jangan mengklaim diri sebagai": "jangan mengaku sebagai",
    "terima kasih banyak": "terima kasih",
    "i would really appreciate it if you could": "",
    "could you please": "",
    "would you please": "",
    "i want to": "",
    "i would like to": "",
    "due to the fact that": "because",
    "in order to": "to",
    "make sure that": "ensure",
    "take into consideration": "consider",
    "at the very end": "last",
  },
  synonyms: {
    application: "app",
    applications: "apps",
    approximately: "about",
    demonstrate: "show",
    explanation: "reason",
    information: "info",
    mahasiswa: "mhs",
    menggunakan: "pakai",
    gunakan: "pakai",
    memberikan: "beri",
    berikan: "beri",
    menjelaskan: "jelaskan",
    pertanyaan: "tanya",
  },
  blacklist: [
    "actually",
    "basically",
    "just",
    "kindly",
    "please",
    "really",
    "simply",
    "very",
    "dong",
    "nih",
    "sih",
    "tolong",
    "mohon",
  ],
};

const PROTECTED_PATTERN = /(```[\s\S]*?```|`[^`\n]+`|https?:\/\/[^\s)]+|mailto:[^\s)]+)/gi;
const WORD_PATTERN = /^[\p{L}\p{N}_'-]+$/u;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildStats(original: string, compressed: string): CompressionStats {
  const originalChars = original.length;
  const compressedChars = compressed.length;
  const savedChars = Math.max(0, originalChars - compressedChars);
  return {
    originalChars,
    compressedChars,
    savedChars,
    savedPercent: originalChars === 0 ? 0 : Math.round((savedChars / originalChars) * 100),
  };
}

export class Defluffer {
  private phrases: Record<string, string>;
  private synonyms: Record<string, string>;
  private blacklist: Set<string>;

  constructor(dictionaries: Partial<Dictionaries> = {}) {
    this.phrases = { ...DEFAULT_DICTIONARIES.phrases, ...dictionaries.phrases };
    this.synonyms = { ...DEFAULT_DICTIONARIES.synonyms, ...dictionaries.synonyms };
    this.blacklist = new Set([
      ...DEFAULT_DICTIONARIES.blacklist,
      ...(dictionaries.blacklist ?? []),
    ]);
  }

  compress(input: string): DefluffedText {
    const protectedItems: string[] = [];
    const original = input;

    let text = input.replace(PROTECTED_PATTERN, (match) => {
      protectedItems.push(match);
      return ` PROT${protectedItems.length - 1}PROT `;
    });

    for (const [phrase, replacement] of Object.entries(this.phrases)) {
      if (!phrase.trim()) continue;
      const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "giu");
      text = text.replace(regex, replacement ? ` ${replacement} ` : " ");
    }

    const singleWordBlacklist = [...this.blacklist].filter((entry) => !entry.includes(" "));
    const blacklistRegexes = singleWordBlacklist.map(
      (entry) => new RegExp(`\\b${escapeRegex(entry)}\\b`, "giu"),
    );
    for (const regex of blacklistRegexes) {
      text = text.replace(regex, " ");
    }

    text = text
      .split(/(\s+|[.,?!;:()[\]{}])/u)
      .map((token) => {
        if (!WORD_PATTERN.test(token) || /^PROT\d+PROT$/u.test(token)) return token;
        return this.synonyms[token.toLowerCase()] ?? token;
      })
      .join("");

    text = this.cleanup(text);

    protectedItems.forEach((item, index) => {
      text = text.replaceAll(`PROT${index}PROT`, item);
    });

    const compressed = this.cleanup(text);
    if (!compressed || compressed.length >= original.length) {
      return {
        text: original,
        stats: buildStats(original, original),
      };
    }

    return {
      text: compressed,
      stats: buildStats(original, compressed),
    };
  }

  private cleanup(text: string) {
    return text
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\s+([.,?!;:])/g, "$1")
      .replace(/([([{])\s+/g, "$1")
      .replace(/\s+([)\]}])/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}

const outboundDefluffer = new Defluffer();

export function defluffForClaude(input: string): DefluffedText {
  return outboundDefluffer.compress(input);
}
