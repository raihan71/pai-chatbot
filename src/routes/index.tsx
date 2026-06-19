import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { Sparkles, BookOpen, Clock, History, ArrowRight } from "lucide-react";
import { logo } from "@/configs/image";
import { DEFAULT_LIMIT } from "@/lib/contentful.server";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const appName = import.meta.env.VITE_ENV_APPNAME || "Sahabat Muslim";
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-hero">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-start justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="sr-only">{appName}</span>
        </Link>
        <nav className="flex items-center gap-2">
          {!isSignedIn ? (
            <>
              <a
                href="/sign-in"
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground"
              >
                Masuk
              </a>
              <a
                href="/sign-up"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90"
              >
                Daftar
              </a>
            </>
          ) : (
            <Link
              to="/chat"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90"
            >
              Buka Chat
            </Link>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/60 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
          <Sparkles className="size-3.5" />
          Teman belajar Islami berbasis AI
        </div>
        <p className="font-arabic mb-3 text-2xl text-primary/80">
          Azami Artificial Intelligence PAI
        </p>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-6xl">
          Teman AI Islami untuk
          <span className="text-primary"> Keseharian Mahasiswa</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Tanyakan hal seputar kehidupan kampus, ibadah, akhlak, motivasi belajar, dan nasihat
          harian berdasarkan nilai-nilai Islam.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {!isSignedIn ? (
            <>
              <a
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:translate-y-[-1px] hover:bg-primary/90"
              >
                Mulai Bertanya
                <ArrowRight className="size-4" />
              </a>
              <a
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
              >
                Sudah punya akun
              </a>
            </>
          ) : (
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:translate-y-[-1px] hover:bg-primary/90"
            >
              Lanjut ke Chat
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Gratis {DEFAULT_LIMIT} pertanyaan untuk setiap akun
        </p>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:translate-y-[-2px]"
            >
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <b.icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Examples */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="text-center text-2xl font-semibold text-foreground md:text-3xl">
          Contoh hal yang bisa kamu tanyakan
        </h2>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {examples.map((e) => (
            <div
              key={e}
              className="rounded-2xl border border-border bg-card/60 px-5 py-4 text-sm text-foreground/90 shadow-soft"
            >
              "{e}"
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center">
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Jawaban AI bersifat <span className="font-medium text-foreground">edukatif</span> dan
            tidak menggantikan nasihat ulama, ustadz, atau lembaga fatwa resmi.
          </p>
          <p className="mt-3 text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} Azami Artificial Intelligence PAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <img
      src={logo.logoWithoutText}
      alt="Sahabat Muslim"
      width={788}
      height={317}
      className="block h-auto w-28 shrink-0 object-contain md:w-[148px]"
      loading="eager"
      decoding="async"
    />
  );
}

const benefits = [
  {
    icon: BookOpen,
    title: "Tanya jawab Islami ringan",
    desc: "Adab, fiqih dasar, akhlak — dijawab dengan bahasa yang hangat dan mudah dipahami.",
  },
  {
    icon: Sparkles,
    title: "Bantu refleksi harian",
    desc: "Motivasi belajar, doa, dan kebiasaan baik untuk merawat hati di tengah kesibukan kampus.",
  },
  {
    icon: Clock,
    title: "Cocok untuk mahasiswa",
    desc: "Bantu atur waktu antara kuliah, organisasi, dan ibadah secara seimbang.",
  },
  {
    icon: History,
    title: "Riwayat chat tersimpan",
    desc: "Setiap percakapan disimpan agar kamu bisa membacanya kembali kapan saja.",
  },
];

const examples = [
  "Bagaimana cara menjaga semangat belajar dalam Islam?",
  "Doa apa yang bisa dibaca sebelum ujian?",
  "Bagaimana adab terhadap dosen dan teman?",
  "Bagaimana mengatur waktu antara kuliah, organisasi, dan ibadah?",
];
