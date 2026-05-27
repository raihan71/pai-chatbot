import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedGate,
});

function AuthenticatedGate() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in/$" params={{ _splat: "" }} replace />;
  }

  return <Outlet />;
}
