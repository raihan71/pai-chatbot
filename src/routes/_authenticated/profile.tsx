import { createFileRoute, Link } from "@tanstack/react-router";
import { useClerk, useUser } from "@clerk/tanstack-react-start";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUsageInfo } from "@/lib/chat.functions";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const userId = user?.id;
  const fn = useServerFn(getUsageInfo);
  const { data: usage } = useQuery({
    queryKey: ["usage", userId],
    enabled: !!userId,
    queryFn: () => fn(),
  });
  const remaining = usage ? Math.max(0, usage.limit - usage.totalQuestions) : 3;

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/sign-in" })
      .then(() => {
        // Sign-out successful, redirect to the sign-in page
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
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
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-4">
            {user?.imageUrl && <img src={user.imageUrl} alt="" className="size-16 rounded-full" />}
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {user?.fullName ?? user?.firstName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Stat label="User ID" value={user?.id ?? "-"} mono />
            <Stat
              label="Bergabung"
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID") : "-"}
            />
            <Stat label="Total pertanyaan" value={`${usage?.totalQuestions ?? 0}`} />
            <Stat label="Sisa pertanyaan" value={`${remaining} / ${usage?.limit ?? 3}`} highlight />
          </dl>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Keluar akun</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Akhiri sesi login dan kembali ke halaman masuk.
              </p>
            </div>
            <Button type="button" variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" />
              Keluar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border p-4 ${highlight ? "bg-primary/5" : "bg-background"}`}
    >
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm font-medium text-foreground ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
