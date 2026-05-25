import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Style = "ringkas" | "detail" | "praktis";

function SettingsPage() {
  const [dark, setDark] = useState(false);
  const [style, setStyle] = useState<Style>("praktis");

  useEffect(() => {
    const d = localStorage.getItem("smm_theme") === "dark";
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    setStyle((localStorage.getItem("smm_style") as Style) || "praktis");
  }, []);

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
