import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const a = await auth();
  return { userId: a.userId };
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { userId } = await checkAuth();
    if (!userId) {
      throw redirect({ to: "/sign-in/$", params: { _splat: "" } });
    }
  },
  component: () => <Outlet />,
});
