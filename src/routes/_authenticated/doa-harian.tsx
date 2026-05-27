import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { getDuaByNumber, DUA_TOTAL } from "@/lib/dua.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/doa-harian")({
  component: DoaHarianPage,
});

function buildPaginationItems(page: number, total: number) {
  const raw = new Set([1, total, page - 1, page, page + 1]);
  const pages = Array.from(raw)
    .filter((item) => item >= 1 && item <= total)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];
  let previous = 0;

  for (const item of pages) {
    if (previous && item - previous > 1) {
      items.push("ellipsis");
    }
    items.push(item);
    previous = item;
  }

  return items;
}

function DoaHarianPage() {
  const [duaNumber, setDuaNumber] = useState(1);
  const getDuaByNumberFn = useServerFn(getDuaByNumber);

  useEffect(() => {
    setDuaNumber((current) => Math.min(Math.max(1, current), DUA_TOTAL));
  }, []);

  const duaQ = useQuery({
    queryKey: ["dua", duaNumber],
    queryFn: () => getDuaByNumberFn({ data: { duaNumber } }),
    staleTime: 1000 * 60 * 5,
  });

  const paginationItems = buildPaginationItems(duaNumber, DUA_TOTAL);

  const goToPage = (nextPage: number) => {
    setDuaNumber(Math.min(Math.max(1, nextPage), DUA_TOTAL));
  };

  return (
    <div className="min-h-screen bg-hero p-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/chat"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali ke Chat
        </Link>

        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="size-5 text-primary" />
                Doa Harian
              </CardTitle>
              <CardDescription>
                Kumpulan doa harian dengan tampilan kartu dan navigasi halaman yang sederhana.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Total doa
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{DUA_TOTAL}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Isi koleksi dapat dibuka per halaman.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Halaman aktif
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {duaNumber} <span className="text-sm text-muted-foreground">/ {DUA_TOTAL}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gunakan navigasi di bawah untuk berpindah.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-gold/10 p-4 shadow-soft">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,214,102,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(25,111,92,0.14),transparent_32%)]" />
            <div className="relative">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                    Doa lengkap
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tampilan dibuat lebih fokus untuk membaca dan menghafal.
                  </p>
                </div>
                <span className="rounded-full border border-gold/30 bg-gold/15 px-2.5 py-1 text-[11px] font-medium text-gold-foreground">
                  {duaQ.data ? "Siap dibaca" : "Memuat..."}
                </span>
              </div>

              {duaQ.isLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-foreground/10" />
                  <div className="h-24 animate-pulse rounded-2xl bg-foreground/5" />
                  <div className="h-4 w-52 animate-pulse rounded-full bg-foreground/10" />
                </div>
              ) : duaQ.isError ? (
                <div className="space-y-3 rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                    <span className="size-1.5 rounded-full bg-gold" />
                    Doa lengkap
                  </div>
                  <p>Gagal memuat doa pada halaman ini. Coba pindah halaman lagi.</p>
                </div>
              ) : duaQ.data ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                    <span className="size-1.5 rounded-full bg-gold" />
                    {duaQ.data.group} • No. {duaQ.data.id}
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                    <p className="font-arabic text-2xl leading-[1.9] text-foreground/95 [direction:rtl]">
                      {duaQ.data.arabic}
                    </p>
                  </div>
                  {duaQ.data.transliteration ? (
                    <div className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                      {duaQ.data.transliteration}
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                    {duaQ.data.translation}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span>Sumber: {duaQ.data.source}</span>
                    <span className="rounded-full bg-background/80 px-2 py-1 text-foreground/70">
                      #{duaNumber}
                    </span>
                  </div>
                  {duaQ.data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {duaQ.data.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-4"></CardHeader>
            <CardContent>
              <Pagination className="justify-end">
                <PaginationContent className="flex-wrap justify-start">
                  <PaginationItem>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => goToPage(duaNumber - 1)}
                      disabled={duaNumber <= 1}
                    >
                      <ChevronLeft className="size-4" />
                      Sebelumnya
                    </Button>
                  </PaginationItem>

                  {paginationItems.map((item, index) =>
                    item === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <Button
                          type="button"
                          variant={item === duaNumber ? "default" : "outline"}
                          size="icon"
                          onClick={() => goToPage(item)}
                          className="rounded-full"
                        >
                          {item}
                        </Button>
                      </PaginationItem>
                    ),
                  )}

                  <PaginationItem>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => goToPage(duaNumber + 1)}
                      disabled={duaNumber >= DUA_TOTAL}
                    >
                      Berikutnya
                      <ChevronRight className="size-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
