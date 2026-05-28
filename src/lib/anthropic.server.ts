import Anthropic from "@anthropic-ai/sdk";
import { services } from "@/configs/api";

let client: Anthropic | null = null;
const appName = import.meta.env.VITE_ENV_APPNAME || "Sahabat Muslim";
const citationUrl = (services.citation || "").trim();
const joinCitationPath = (path: string) =>
  citationUrl ? new URL(path, citationUrl).toString() : null;
const citationPages = {
  pendaftaran: joinCitationPath("/info/pmb/register"),
  biaya: joinCitationPath("/services/baak/pmb"),
  prodi: joinCitationPath("/academic/courses/pai"),
  jadwal: joinCitationPath("/academic/calendar"),
  dosen: joinCitationPath("/profile/teachers"),
  kontak: joinCitationPath("/contact"),
  pimpinan: joinCitationPath("/profile/about/leadership"),
};

const citationPageKeywords: Array<{
  page: keyof typeof citationPages;
  keywords: string[];
}> = [
  {
    page: "pendaftaran",
    keywords: ["pendaftaran", "daftar", "pmb", "registrasi", "register", "mahasiswa baru"],
  },
  {
    page: "biaya",
    keywords: ["biaya", "ukt", "spp", "pembayaran", "tagihan", "baak"],
  },
  {
    page: "prodi",
    keywords: ["prodi", "program studi", "jurusan", "pai", "mata kuliah", "kurikulum"],
  },
  {
    page: "jadwal",
    keywords: ["jadwal", "kalender", "akademik", "libur", "semester", "kuliah"],
  },
  {
    page: "dosen",
    keywords: ["dosen", "pengajar", "guru", "lecturer", "teacher"],
  },
  {
    page: "kontak",
    keywords: ["kontak", "alamat", "telepon", "whatsapp", "wa", "email", "lokasi"],
  },
  {
    page: "pimpinan",
    keywords: ["pimpinan", "rektor", "dekan", "wadek", "ketua", "direktur"],
  },
];

export function getAnthropic(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  client = new Anthropic({ apiKey });
  return client;
}

export const SYSTEM_PROMPT_BASE = `Kamu adalah "${appName}", asisten AI bertema pendidikan agama Islam untuk mahasiswa Indonesia. Jawablah dengan bahasa Indonesia yang ramah, hangat, jelas, dan relevan dengan kehidupan kampus. Berikan nasihat yang menenangkan, praktis, dan sesuai nilai-nilai Islam secara umum (tidak terikat mazhab tertentu).

Pedoman:
- Sapa pengguna dengan ramah seperti seorang teman/kakak yang peduli.
- Jika relevan, sertakan satu doa singkat, adab, atau kebiasaan baik yang bisa langsung dipraktikkan.
- Berikan langkah praktis (mis. jadwal belajar, tips manajemen waktu, adab terhadap dosen/orang tua).
- Hindari nada menghakimi. Akui pergumulan mahasiswa secara empatik.
- Jika pertanyaan menyangkut hukum agama sensitif, perbedaan mazhab, fatwa, halal-haram yang kompleks, atau masalah pribadi berat — sarankan dengan lembut untuk bertanya kepada ustadz, ulama, atau lembaga terpercaya.
- Jangan mengklaim diri sebagai ulama. Jangan mengeluarkan fatwa mutlak.
- Jika mengutip ayat/hadits, tuliskan terjemahannya saja dan ingatkan untuk verifikasi ke sumber terpercaya.`;

function buildCitationInstructions() {
  if (!citationUrl) return "";

  return `

Sumber universitas:
- Untuk pertanyaan mahasiswa tentang informasi universitas/kampus (mis. pendaftaran, akademik, biaya, program studi, jadwal, layanan, beasiswa, kontak, kebijakan, atau fasilitas), gunakan sumber resmi ini sebagai rujukan utama: ${citationUrl}
- Jika informasi spesifik tidak tersedia/kurang jelas dari sumber tersebut, katakan bahwa informasinya perlu dicek ke pihak kampus dan tetap berikan link sumber.
- Untuk jawaban yang memuat fakta universitas, akhiri dengan baris "Sumber: ${citationUrl}".`;
}

export function buildSystemPrompt(style: "ringkas" | "detail" | "praktis"): string {
  const styleHint =
    style === "ringkas"
      ? "\n\nGaya jawaban: SINGKAT (maks ~120 kata, fokus inti)."
      : style === "praktis"
        ? "\n\nGaya jawaban: PRAKTIS — fokus pada langkah/tips aksi nyata yang bisa dilakukan hari ini."
        : "\n\nGaya jawaban: DETAIL — beri penjelasan menyeluruh namun tetap terstruktur dengan poin/heading.";
  return SYSTEM_PROMPT_BASE + buildCitationInstructions() + styleHint;
}

export function getCitationUrl(): string | null {
  return citationUrl || null;
}

export function getCitationUrlForMessage(message: string): string | null {
  if (!citationUrl) return null;

  const normalized = message.toLowerCase();
  const match = citationPageKeywords.find(({ page, keywords }) => {
    return !!citationPages[page] && keywords.some((keyword) => normalized.includes(keyword));
  });

  return match ? citationPages[match.page] : citationUrl;
}

export function getCitationHostname(): string | null {
  if (!citationUrl) return null;

  try {
    return new URL(citationUrl).hostname;
  } catch {
    return null;
  }
}
