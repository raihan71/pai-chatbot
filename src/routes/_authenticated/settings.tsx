import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHadithBooks } from "@/lib/hadith.functions";
import {
  DEFAULT_CHAT_CONTENT_MODE,
  DEFAULT_HADITH_BOOK,
  FALLBACK_HADITH_BOOKS,
  readChatContentMode,
  readHadithBook,
  writeChatContentMode,
  writeHadithBook,
  type ChatContentMode,
} from "@/lib/chat-preferences";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Style = "ringkas" | "detail" | "praktis";

function SettingsPage() {
  const [dark, setDark] = useState(false);
  const [style, setStyle] = useState<Style>("praktis");
  const [contentMode, setContentMode] = useState<ChatContentMode>(() =>
    typeof window === "undefined" ? DEFAULT_CHAT_CONTENT_MODE : readChatContentMode(),
  );
  const [hadithBook, setHadithBook] = useState(() =>
    typeof window === "undefined" ? DEFAULT_HADITH_BOOK : readHadithBook(),
  );
  const getHadithBooksFn = useServerFn(getHadithBooks);
  const booksQ = useQuery({
    queryKey: ["hadith-books"],
    queryFn: () => getHadithBooksFn(),
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    const d = localStorage.getItem("smm_theme") === "dark";
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    setStyle((localStorage.getItem("smm_style") as Style) || "praktis");
  }, []);

  useEffect(() => {
    if (contentMode !== "hadith") return;
    const availableBooks = booksQ.data?.length ? booksQ.data : FALLBACK_HADITH_BOOKS;
    const isValid = availableBooks.some((book) => book.id === hadithBook);
    if (!isValid) {
      setHadithBook(DEFAULT_HADITH_BOOK);
      writeHadithBook(DEFAULT_HADITH_BOOK);
    }
  }, [booksQ.data, contentMode, hadithBook]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("smm_theme", next ? "dark" : "light");
  };

  const changeStyle = (s: Style) => {
    setStyle(s);
    localStorage.setItem("smm_style", s);
  };

  const changeContentMode = (mode: ChatContentMode) => {
    setContentMode(mode);
    writeChatContentMode(mode);
  };

  const changeHadithBook = (bookId: string) => {
    setHadithBook(bookId);
    writeHadithBook(bookId);
  };

  const bookOptions = booksQ.data?.length ? booksQ.data : FALLBACK_HADITH_BOOKS;

  return (
    <div className="min-h-screen bg-hero p-6">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/chat"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali ke Chat
        </Link>

        <div className="space-y-4">
          <Card title="Tampilan">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Mode gelap</p>
                <p className="text-xs text-muted-foreground">
                  Lebih nyaman di mata saat malam hari.
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex size-10 items-center justify-center rounded-full border border-border bg-card hover:bg-accent"
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            </div>
          </Card>

          <Card title="Gaya jawaban AI">
            <div className="grid gap-2 sm:grid-cols-3">
              {(["ringkas", "detail", "praktis"] as Style[]).map((s) => (
                <button
                  key={s}
                  onClick={() => changeStyle(s)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                    style === s
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s === "ringkas" ? "Singkat" : s === "detail" ? "Detail" : "Lebih Praktis"}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Pengaturan ini berlaku untuk pertanyaan berikutnya.
            </p>
          </Card>

          <Card title="Konten saat menunggu jawaban">
            <div className="grid gap-2 sm:grid-cols-2">
              {(["hadith", "dua"] as ChatContentMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => changeContentMode(mode)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium capitalize transition ${
                    contentMode === mode
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {mode === "hadith" ? "Hadis" : "Doa"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {mode === "hadith"
                      ? "Menampilkan hadis acak saat AI sedang menulis."
                      : "Menampilkan doa harian saat AI sedang menulis."}
                  </span>
                </button>
              ))}
            </div>

            {contentMode === "hadith" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Pilih kitab hadith
                </label>
                <select
                  value={hadithBook}
                  onChange={(e) => changeHadithBook(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                >
                  {bookOptions.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Default-nya Bukhari. Kamu bisa ganti ke Muslim, Abu Daud, Tirmidzi, Nasai, dan
                  lainnya.
                </p>
              </div>
            )}

            {booksQ.isError && (
              <p className="mt-3 text-xs text-muted-foreground">
                Gagal mengambil daftar kitab hadith dari API. Memakai daftar bawaan sementara.
              </p>
            )}
          </Card>

          <Card title="Disclaimer">
            <p className="text-sm text-muted-foreground">
              Aplikasi ini membantu pembelajaran dasar dan refleksi. Untuk hukum agama yang
              kompleks, silakan merujuk kepada ustadz atau lembaga fatwa terpercaya.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
