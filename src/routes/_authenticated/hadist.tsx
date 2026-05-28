import { Outlet, createFileRoute, Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { getHadithBooks, type HadithBookOption } from "@/lib/hadith.functions";
import {
  DEFAULT_HADITH_BOOK,
  FALLBACK_HADITH_BOOKS,
  readHadithBook,
  writeHadithBook,
} from "@/lib/chat-preferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/hadist")({
  component: HadistLayout,
});

function HadistLayout() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const getHadithBooksFn = useServerFn(getHadithBooks);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchedBookRoute: any = matchRoute({ to: "/hadist/$bookId", fuzzy: false });
  const selectedBookId = matchedBookRoute?.bookId ?? readHadithBook() ?? DEFAULT_HADITH_BOOK;

  const currentBook =
    bookOptions.find((book) => book.id === selectedBookId) ?? bookOptions[0] ?? null;

  useEffect(() => {
    if (matchedBookRoute) return;

    writeHadithBook(DEFAULT_HADITH_BOOK);
    navigate({
      to: "/hadist/$bookId",
      params: { bookId: DEFAULT_HADITH_BOOK },
      replace: true,
    });
  }, [matchedBookRoute, navigate]);

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
                <BookOpen className="size-5 text-primary" />
                Hadist
              </CardTitle>
              <CardDescription>
                Pilih kitab dari dropdown untuk membuka halaman detail hadist pada nested route
                khusus tiap kitab.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {bookOptions.map((book) => (
                  <Button
                    key={book.id}
                    type="button"
                    variant={book.id === currentBook?.id ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      writeHadithBook(book.id);
                      navigate({
                        to: "/hadist/$bookId",
                        params: { bookId: book.id },
                      });
                    }}
                  >
                    {book.name}
                    <ChevronRight className="size-4" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
