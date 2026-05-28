import { createFileRoute, Link } from "@tanstack/react-router";
import { useUser, UserButton } from "@clerk/tanstack-react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getThreads, getThread, getUsageInfo, sendMessage } from "@/lib/chat.functions";
import { getRandomDua, type DuaCard } from "@/lib/dua.functions";
import { getRandomHadith, type HadithCard } from "@/lib/hadith.functions";
import { ChatMarkdown } from "@/components/chat-markdown";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock3, Menu, MessageCircle, Plus, Send } from "lucide-react";
import { images } from "@/configs/image";
import {
  DEFAULT_CHAT_CONTENT_MODE,
  DEFAULT_HADITH_BOOK,
  readChatContentMode,
  readHadithBook,
  type ChatContentMode,
} from "@/lib/chat-preferences";
import menus from "@/configs/menu";

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
      lastName?: string | null;
    }
  | null
  | undefined;

type ReferenceCard = ({ kind: "hadith" } & HadithCard) | ({ kind: "dua" } & DuaCard);

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
  const [showAllThreads, setShowAllThreads] = useState(false);

  useEffect(() => {
    if (threads.length <= 6 && showAllThreads) {
      setShowAllThreads(false);
    }
  }, [showAllThreads, threads.length]);

  const visibleThreads = showAllThreads ? threads : threads.slice(0, 6);
  const hasMoreThreads = threads.length > 6;

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex justify-center items-center rounded-full bg-primary/5 p-1">
          <img
            src={images.logoDark}
            alt={appName}
            width={28}
            height={28}
            className="rounded-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-sidebar-foreground">{appName}</p>
          <p className="text-xs text-muted-foreground">
            {user?.firstName || "Pengguna"} {user?.lastName || ""}
          </p>
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
          <>
            <ul className={`space-y-0.5 ${showAllThreads ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
              {visibleThreads.map((t) => (
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
            {hasMoreThreads ? (
              <button
                onClick={() => setShowAllThreads((v) => !v)}
                className="mt-2 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground transition hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                {showAllThreads
                  ? "Tampilkan lebih sedikit"
                  : `Lihat ${threads.length - 6} percakapan lainnya`}
              </button>
            ) : null}
          </>
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
          {menus.map((menu, index) => (
            <Link
              key={index}
              to={menu.path}
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
            >
              {menu.icon}
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate">{menu.name}</span>
                {menu.badge ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-foreground dark:border-gold/50 dark:bg-gold/20 dark:text-gold-300">
                    {menu.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-3 mb-2 flex items-center justify-between rounded-lg px-2 py-2">
          <div className="flex items-center gap-2">
            <UserButton />
            <span className="truncate text-xs text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress ?? user?.firstName}
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <footer className="flex items-center justify-center gap-1 p-2 text-xs text-muted-foreground bg-background/50">
          <small className="text-xs text-muted-foreground">Beta Version 1.0.0</small>
        </footer>
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
  const getRandomDuaFn = useServerFn(getRandomDua);

  const [sessionId, setSessionId] = useState<string>(() => newSessionId());
  const [input, setInput] = useState("");
  const [style, setStyle] = useState<Style>(() => {
    if (typeof window === "undefined") return "praktis";
    return (localStorage.getItem("smm_style") as Style) || "praktis";
  });
  const [contentMode, setContentMode] = useState<ChatContentMode>(() =>
    typeof window === "undefined" ? DEFAULT_CHAT_CONTENT_MODE : readChatContentMode(),
  );
  const [hadithBook, setHadithBook] = useState(() =>
    typeof window === "undefined" ? DEFAULT_HADITH_BOOK : readHadithBook(),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [referenceCard, setReferenceCard] = useState<ReferenceCard | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const referenceLoadingRef = useRef(false);
  const referenceRefreshQueuedRef = useRef(false);

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

  const prefetchReference = useCallback(() => {
    if (referenceLoadingRef.current) {
      referenceRefreshQueuedRef.current = true;
      return;
    }

    referenceLoadingRef.current = true;
    setReferenceCard(null);
    setReferenceLoading(true);
    setReferenceError(false);

    void (async () => {
      try {
        if (contentMode === "hadith") {
          const card = await getRandomHadithFn({ data: { bookId: hadithBook } });
          setReferenceCard({ kind: "hadith", ...card });
        } else {
          const card = await getRandomDuaFn();
          setReferenceCard({ kind: "dua", ...card });
        }
      } catch {
        setReferenceError(true);
      } finally {
        referenceLoadingRef.current = false;
        setReferenceLoading(false);

        if (referenceRefreshQueuedRef.current) {
          referenceRefreshQueuedRef.current = false;
          prefetchReference();
        }
      }
    })();
  }, [contentMode, getRandomDuaFn, getRandomHadithFn, hadithBook]);

  useEffect(() => {
    if (sendM.isPending) {
      prefetchReference();
    }
  }, [sendM.isPending, prefetchReference]);

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
    <div className="md:flex h-screen w-full bg-background">
      <Dialog>
        <div className="fixed right-3 top-20 z-40 md:right-6 md:top-22">
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-full border-border bg-gradient-to-bl from-slate-50 to-stone-100 text-foreground/90 dark:bg-gradient-to-br dark:from-slate-800 dark:to-stone-900 dark:text-foreground/90 dark:shadow-lg dark:backdrop-blur md:h-11 md:w-11 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Buka jadwal sholat"
            >
              <Clock3 className="size-4 animate-spin" />
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent className="w-[min(92vw,380px)] max-w-none rounded-2xl border-border p-0 shadow-xl">
          <DialogHeader className="border-b border-border px-5 py-4 text-left sm:text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Clock3 className="size-4 text-primary" />
              Jadwal Sholat
            </DialogTitle>
            <DialogDescription>Jangan sampai ketinggalan waktu ibadahya!</DialogDescription>
          </DialogHeader>

          <div className="p-4">
            <div className="flex flex-col items-center gap-3">
              <iframe
                src="https://www.jadwalsholat.org/adzan/ajax.row.php?id=308"
                title="Jadwal Sholat"
                frameBorder="0"
                width="220"
                height="220"
                scrolling="no"
                className="rounded-md"
              />
              <iframe
                src="https://time.wf/widget.php"
                title="Waktu"
                scrolling="no"
                frameBorder="0"
                width="110"
                height="45"
                className="rounded-md"
              />
              <a
                href="https://www.jadwalsholat.org"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Sumber jadwal sholat
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <div className="inline-flex w-fit rounded-2xl bg-gradient-to-l from-slate-50 to-stone-100 p-2">
                  <img
                    src={images.logoAccent}
                    alt={appName}
                    width={200}
                    height={200}
                    className="mx-auto"
                    loading="eager"
                    decoding="async"
                  />
                </div>
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
                          {contentMode === "hadith" ? "Hadis cepat" : "Doa cepat"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {contentMode === "hadith"
                            ? "Baca/hafalin hadis ini yuk sambil menunggu jawabanmu selesai dibuat!"
                            : "Baca doa ini yuk sambil menunggu jawabanmu selesai dibuat!"}
                        </p>
                      </div>
                      <span className="rounded-full border border-gold/30 bg-gold/15 px-2.5 py-1 text-[11px] font-medium text-gold-foreground">
                        {referenceCard ? "Siap dibaca" : "Memuat..."}
                      </span>
                    </div>

                    {referenceLoading ? (
                      <div className="space-y-3">
                        <div className="h-4 w-32 animate-pulse rounded-full bg-foreground/10" />
                        <div className="h-20 animate-pulse rounded-2xl bg-foreground/5" />
                        <div className="h-4 w-48 animate-pulse rounded-full bg-foreground/10" />
                      </div>
                    ) : referenceCard?.kind === "hadith" ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                          <span className="size-1.5 rounded-full bg-gold" />
                          {referenceCard.bookName} • No. {referenceCard.hadithNumber}
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                          <p className="font-arabic text-2xl leading-[1.9] text-foreground/95 [direction:rtl]">
                            {referenceCard.arabic}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                          {referenceCard.translation}
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                          <span>Sumber: {referenceCard.source}</span>
                          <span className="rounded-full bg-background/80 px-2 py-1 text-foreground/70">
                            Prefetched
                          </span>
                        </div>
                      </div>
                    ) : referenceCard?.kind === "dua" ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                          <span className="size-1.5 rounded-full bg-gold" />
                          {referenceCard.group} • No. {referenceCard.id}
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                          <p className="font-arabic text-2xl leading-[1.9] text-foreground/95 [direction:rtl]">
                            {referenceCard.arabic}
                          </p>
                        </div>
                        {referenceCard.transliteration ? (
                          <div className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                            {referenceCard.transliteration}
                          </div>
                        ) : null}
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                          {referenceCard.translation}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
                          <span>Sumber: {referenceCard.source}</span>
                          {referenceCard.tags.length > 0 ? (
                            <span className="rounded-full bg-background/80 px-2 py-1 text-foreground/70">
                              {referenceCard.tags.slice(0, 2).join(", ")}
                            </span>
                          ) : (
                            <span className="rounded-full bg-background/80 px-2 py-1 text-foreground/70">
                              Prefetched
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                          <span className="size-1.5 rounded-full bg-gold" />
                          {contentMode === "hadith" ? "Hadis cepat" : "Doa cepat"}
                        </div>
                        <p>
                          {referenceError
                            ? contentMode === "hadith"
                              ? "Hadis belum berhasil dimuat. Akan dicoba lagi pada siklus berikutnya."
                              : "Doa belum berhasil dimuat. Akan dicoba lagi pada siklus berikutnya."
                            : contentMode === "hadith"
                              ? "Menyiapkan hadis acak untuk ditampilkan saat jawaban AI selesai."
                              : "Menyiapkan doa acak untuk ditampilkan saat jawaban AI selesai."}
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
              Jawaban AI bersifat edukatif. Untuk hukum agama yang kompleks, butuh bimbingan lebih
              lanjut.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
