import { auth } from "@clerk/tanstack-react-start/server";

export async function requireUserId(): Promise<string> {
  const a = await auth();
  if (!a.userId) {
    throw new Error("Unauthorized: please sign in.");
  }
  return a.userId;
}

export async function getCurrentUserId(): Promise<string | null> {
  const a = await auth();
  return a.userId ?? null;
}
