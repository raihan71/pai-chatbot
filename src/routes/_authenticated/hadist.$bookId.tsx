import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { getHadithBooks, getHadithByNumber, type HadithBookOption } from "@/lib/hadith.functions";
import { FALLBACK_HADITH_BOOKS, writeHadithBook } from "@/lib/chat-preferences";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/hadist/$bookId")({
  component: HadistBookDetailPage,
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

function HadistBookDetailPage() {
  const { bookId: routeBookId } = Route.useParams();
  const [hadithNumber, setHadithNumber] = useState(1);

  const getHadithBooksFn = useServerFn(getHadithBooks);
  const getHadithByNumberFn = useServerFn(getHadithByNumber);

  const booksQ = useQuery({
    queryKey: ["hadith-books"],
    queryFn: () => getHadithBooksFn(),
    staleTime: 1000 * 60 * 60,
  });

  const bookOptions: HadithBookOption[] = useMemo(
    () =>
      (booksQ.data?.length ? booksQ.data : FALLBACK_HADITH_BOOKS.map((book) => ({ ...book }))).map(
        (book) => ({
          ...book,
          id: book.id.trim().toLowerCase(),
        }),
      ),
    [booksQ.data],
  );

  const currentBook =
    bookOptions.find((book) => book.id === routeBookId.trim().toLowerCase()) ?? null;

  const totalHadith = currentBook?.available ?? 150;

  useEffect(() => {
    writeHadithBook(routeBookId);
  }, [routeBookId]);

  useEffect(() => {
    setHadithNumber((current) => Math.min(Math.max(1, current), totalHadith));
  }, [totalHadith]);

  const hadithQ = useQuery({
    queryKey: ["hadith", routeBookId, hadithNumber],
    queryFn: () => getHadithByNumberFn({ data: { bookId: routeBookId, hadithNumber } }),
    enabled: !!currentBook,
    staleTime: 1000 * 60 * 5,
  });

  const goToPage = (nextPage: number) => {
    setHadithNumber(Math.min(Math.max(1, nextPage), totalHadith));
  };

  const paginationItems = buildPaginationItems(hadithNumber, totalHadith);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-gold/10 p-4 shadow-soft">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,214,102,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(25,111,92,0.14),transparent_32%)]" />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
              Detail hadist
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentBook?.name ?? routeBookId} - Total hadist: {totalHadith}
            </p>
          </div>
        </div>

        {currentBook ? (
          <>
            {hadithQ.isLoading ? (
              <div className="space-y-3">
                <div className="h-4 w-36 animate-pulse rounded-full bg-foreground/10" />
                <div className="h-24 animate-pulse rounded-2xl bg-foreground/5" />
                <div className="h-4 w-52 animate-pulse rounded-full bg-foreground/10" />
              </div>
            ) : hadithQ.isError ? (
              <div className="space-y-3 rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                  <span className="size-1.5 rounded-full bg-gold" />
                  Detail hadist
                </div>
                <p>
                  Gagal memuat hadist untuk kitab ini. Coba pindah halaman atau pilih kitab lain.
                </p>
              </div>
            ) : hadithQ.data ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                  <span className="size-1.5 rounded-full bg-gold" />
                  {hadithQ.data.bookName} • No. {hadithQ.data.hadithNumber}
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                  <p className="font-arabic text-2xl leading-[1.9] text-foreground/95 [direction:rtl]">
                    {hadithQ.data.arabic}
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                  {hadithQ.data.translation}
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>Sumber: {hadithQ.data.source}</span>
                  <span className="rounded-full bg-background/80 px-2 py-1 text-foreground/70">
                    {hadithNumber} / {totalHadith}
                  </span>
                </div>
              </div>
            ) : null}

            <Card className="mt-4">
              <CardHeader className="pb-4" />
              <CardContent>
                <Pagination className="justify-end">
                  <PaginationContent className="flex-wrap justify-start">
                    <PaginationItem>
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={() => goToPage(hadithNumber - 1)}
                        disabled={hadithNumber <= 1}
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
                            variant={item === hadithNumber ? "default" : "outline"}
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
                        onClick={() => goToPage(hadithNumber + 1)}
                        disabled={hadithNumber >= totalHadith}
                      >
                        Berikutnya
                        <ChevronRight className="size-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="mt-4">
            <CardContent className="py-6 text-sm text-muted-foreground">
              Kitab ini tidak ditemukan. Pilih kitab lain dari dropdown.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
