import { createFileRoute, Link } from "@tanstack/react-router";
import { useUser, UserButton } from "@clerk/tanstack-react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getRandomHadith,
  getThreads,
  getThread,
  getUsageInfo,
  sendMessage,
} from "@/lib/chat.functions";
import { ChatMarkdown } from "@/components/chat-markdown";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Home,
  Menu,
  MessageCircle,
  Plus,
  Send,
  Settings as SettingsIcon,
  User,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

const appName = (import.meta.env.VITE_ENV_APPNAME || "Sahabat Muslim").trim();

function newSessionId() {
  return "s_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

type Style = "ringkas" | "detail" | "praktis";

type Thread = {
  sessionId: string;
  title?: string | null;
};

type SidebarUser =
  | {
      primaryEmailAddress?: {
        emailAddress?: string | null;
      } | null;
      firstName?: string | null;
    }
  | null
  | undefined;

type HadithCard = {
  bookName: string;
  bookId: string;
  hadithNumber: number;
  arabic: string;
  translation: string;
  source: string;
};

function SidebarPanel({
  user,
  threads,
  remaining,
  usageLimit,
  sessionId,
  canCompose,
  onNewThread,
  onSelectThread,
  onNavigate,
}: {
  user: SidebarUser;
  threads: Thread[];
  remaining: number;
  usageLimit?: number;
  sessionId: string;
  canCompose: boolean;
  onNewThread: () => void;
  onSelectThread: (sessionId: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="font-arabic text-lg leading-none">ﷲ</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-sidebar-foreground">{appName}</p>
          <p className="text-xs text-muted-foreground">Mahasiswa</p>
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={onNewThread}
          disabled={!canCompose}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" /> Percakapan baru
        </button>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-2">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Riwayat
        </p>
        {threads.length > 0 ? (
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.sessionId}>
                <button
                  onClick={() => {
                    onSelectThread(t.sessionId);
                    onNavigate?.();
                  }}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    sessionId === t.sessionId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                  }`}
                >
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary/70" />
                  <span className="line-clamp-2 text-[13px] leading-snug">
                    {t.title || "Percakapan"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 text-xs text-muted-foreground">Belum ada percakapan.</p>
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-3 rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Pertanyaan tersisa
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {remaining} <span className="text-muted-foreground">/ {usageLimit ?? 3}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <Link
            to="/profile"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          >
            <User className="size-4" /> Profile
          </Link>
          <Link
            to="/settings"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          >
            <SettingsIcon className="size-4" /> Setting
          </Link>
          <Link
            to="/"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          >
            <Home className="size-4" /> Beranda
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg px-2 py-2">
          <div className="flex items-center gap-2">
            <UserButton />
            <span className="truncate text-xs text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress ?? user?.firstName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPage() {
  const { user } = useUser();
  const userId = user?.id;
  const qc = useQueryClient();
  const getThreadsFn = useServerFn(getThreads);
  const getThreadFn = useServerFn(getThread);
  const getUsageFn = useServerFn(getUsageInfo);
  const sendFn = useServerFn(sendMessage);
  const getRandomHadithFn = useServerFn(getRandomHadith);

  const [sessionId, setSessionId] = useState<string>(() => newSessionId());
  const [input, setInput] = useState("");
  const [style, setStyle] = useState<Style>(() => {
    if (typeof window === "undefined") return "praktis";
    return (localStorage.getItem("smm_style") as Style) || "praktis";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hadithCard, setHadithCard] = useState<HadithCard | null>(null);
  const [hadithLoading, setHadithLoading] = useState(false);
  const [hadithError, setHadithError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hadithLoadingRef = useRef(false);
  const hadithRefreshQueuedRef = useRef(false);
  const hadithCardRef = useRef<HadithCard | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("smm_style", style);
  }, [style]);

  const threadsQ = useQuery({
    queryKey: ["threads", userId],
    enabled: !!userId,
    queryFn: () => getThreadsFn(),
  });
  const usageQ = useQuery({
    queryKey: ["usage", userId],
    enabled: !!userId,
    queryFn: () => getUsageFn(),
  });
  const threadQ = useQuery({
    queryKey: ["thread", userId, sessionId],
    enabled: !!userId,
    queryFn: () => getThreadFn({ data: { sessionId } }),
  });

  const messages = threadQ.data?.messages ?? [];
  const usage = usageQ.data;
  const remaining = usage ? Math.max(0, usage.limit - usage.totalQuestions) : 3;
  const quotaReady = usageQ.isSuccess;
  const exhausted = quotaReady && remaining <= 0;
  const canCompose = quotaReady && remaining > 0;

  const sendM = useMutation({
    mutationFn: (msg: string) => sendFn({ data: { sessionId, message: msg, style } }),
    onSuccess: (res) => {
      if (!res.ok) {
        if (res.error === "limit") {
          toast.error("Batas pertanyaan gratis kamu sudah habis (3/3).");
        } else {
          toast.error("Gagal mendapat jawaban. Coba lagi sebentar lagi.");
        }
        qc.invalidateQueries({ queryKey: ["usage", userId] });
        return;
      }
      qc.invalidateQueries({ queryKey: ["thread", userId, sessionId] });
      qc.invalidateQueries({ queryKey: ["threads", userId] });
      qc.invalidateQueries({ queryKey: ["usage", userId] });
    },
    onError: () => toast.error("Terjadi kesalahan jaringan."),
  });

  const prefetchHadith = useCallback(() => {
    if (hadithLoadingRef.current) {
      hadithRefreshQueuedRef.current = true;
      return;
    }

    hadithLoadingRef.current = true;
    setHadithLoading(true);
    setHadithError(false);

    void (async () => {
      try {
        const card = await getRandomHadithFn();
        setHadithCard(card);
      } catch {
        setHadithError(true);
      } finally {
        hadithLoadingRef.current = false;
        setHadithLoading(false);

        if (hadithRefreshQueuedRef.current) {
          hadithRefreshQueuedRef.current = false;
          prefetchHadith();
        }
      }
    })();
  }, [getRandomHadithFn]);

  useEffect(() => {
    hadithCardRef.current = hadithCard;
  }, [hadithCard]);

  useEffect(() => {
    if (!sendM.isPending || !hadithCardRef.current) {
      prefetchHadith();
    }
  }, [sendM.isPending, prefetchHadith]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sendM.isPending]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendM.isPending || !canCompose) return;
    setInput("");
    sendM.mutate(text);
  };

  const startNewThread = () => {
    if (!canCompose) {
      toast.error("Batas pertanyaan gratis kamu sudah habis.");
      return false;
    }
    setSessionId(newSessionId());
    return true;
  };

  const examples = useMemo(
    () => [
      "Bagaimana cara menjaga semangat belajar dalam Islam?",
      "Doa apa yang bisa dibaca sebelum ujian?",
      "Bagaimana adab terhadap dosen dan teman?",
      "Bagaimana mengatur waktu antara kuliah, organisasi, dan ibadah?",
    ],
    [],
  );

  return (
    <div className="flex h-screen w-full bg-background">
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[18rem] max-w-none border-r border-border p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Navigation menu for the chat page.</SheetDescription>
          </SheetHeader>
          <SidebarPanel
            user={user}
            threads={threadsQ.data ?? []}
            remaining={remaining}
            usageLimit={usage?.limit}
            sessionId={sessionId}
            canCompose={canCompose}
            onNewThread={() => {
              if (startNewThread()) {
                setSidebarOpen(false);
              }
            }}
            onSelectThread={(nextSessionId) => setSessionId(nextSessionId)}
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card/60 px-4 py-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground">
                Assalamu'alaikum, {user?.firstName ?? "Sahabat"} 👋
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Tanyakan apa saja seputar adab, ibadah, dan kehidupan kampus.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as Style)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground"
            >
              <option value="praktis">Gaya: Praktis</option>
              <option value="ringkas">Gaya: Singkat</option>
              <option value="detail">Gaya: Detail</option>
            </select>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.length === 0 && !sendM.isPending && (
              <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
                <p className="font-arabic text-xl text-primary">السلام عليكم</p>
                <h2 className="mt-2 text-lg font-semibold text-foreground">
                  Mau mulai dari mana hari ini?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Coba salah satu contoh pertanyaan ini:
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setInput(ex)}
                      disabled={!canCompose}
                      className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm text-foreground/90 transition hover:border-primary/40 hover:bg-accent disabled:opacity-50"
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft"
                      : "max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-soft"
                  }
                >
                  {m.role === "assistant" && (
                    <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-primary/80">
                      <span className="size-1.5 rounded-full bg-gold" /> Sahabat
                    </div>
                  )}
                  {m.role === "assistant" ? (
                    <ChatMarkdown content={m.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            ))}

            {sendM.isPending && (
              <div className="flex flex-col items-start gap-3">
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-muted-foreground shadow-soft">
                    <span className="flex items-center gap-1.5" aria-hidden="true">
                      <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="size-2 rounded-full bg-gold animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-2 rounded-full bg-primary/70 animate-bounce" />
                    </span>
                    Lagi mengetik jawaban...
                  </div>
                </div>
                <div className="relative w-full max-w-[85%] overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-gold/10 p-4 shadow-soft">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,214,102,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(25,111,92,0.14),transparent_32%)]" />
                  <div className="relative">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                          Hadis cepat
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Baca/hafalin hadis ini yuk sambil menunggu jawabanmu selesai dibuat!
                        </p>
                      </div>
                      <span className="rounded-full border border-gold/30 bg-gold/15 px-2.5 py-1 text-[11px] font-medium text-gold-foreground">
                        {hadithCard ? "Siap dibaca" : "Memuat..."}
                      </span>
                    </div>

                    {hadithLoading ? (
                      <div className="space-y-3">
                        <div className="h-4 w-32 animate-pulse rounded-full bg-foreground/10" />
                        <div className="h-20 animate-pulse rounded-2xl bg-foreground/5" />
                        <div className="h-4 w-48 animate-pulse rounded-full bg-foreground/10" />
                      </div>
                    ) : hadithCard ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                          <span className="size-1.5 rounded-full bg-gold" />
                          {hadithCard.bookName} • No. {hadithCard.hadithNumber}
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                          <p className="font-arabic text-2xl leading-[1.9] text-foreground/95 [direction:rtl]">
                            {hadithCard.arabic}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                          {hadithCard.translation}
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                          <span>Sumber: {hadithCard.source}</span>
                          <span className="rounded-full bg-background/80 px-2 py-1 text-foreground/70">
                            Prefetched
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                          <span className="size-1.5 rounded-full bg-gold" />
                          Hadis cepat
                        </div>
                        <p>
                          {hadithError
                            ? "Hadis belum berhasil dimuat. Akan dicoba lagi pada siklus berikutnya."
                            : "Menyiapkan hadis acak untuk ditampilkan saat jawaban AI selesai."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-card/60 px-4 py-4 md:px-10">
          <div className="mx-auto max-w-3xl">
            {exhausted && (
              <div className="mb-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-foreground">
                Batas pertanyaan gratis kamu sudah habis. Kamu telah menggunakan{" "}
                <strong>{usage?.totalQuestions ?? 3}</strong> dari{" "}
                <strong>{usage?.limit ?? 3}</strong> pertanyaan.
              </div>
            )}
            {!quotaReady && (
              <div className="mb-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Memeriksa kuota pertanyaan...
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-soft focus-within:border-primary/40">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={
                  !quotaReady
                    ? "Memeriksa kuota pertanyaan..."
                    : exhausted
                      ? "Limit pertanyaan sudah habis"
                      : "Tulis pertanyaanmu... (Enter untuk kirim)"
                }
                disabled={!canCompose || sendM.isPending}
                className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
              />
              <button
                onClick={handleSend}
                disabled={!canCompose || sendM.isPending || !input.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                aria-label="Kirim"
              >
                <Send className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Jawaban AI bersifat edukatif. Untuk hukum agama yang kompleks, rujuk pada ustadz atau
              lembaga fatwa terpercaya.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
