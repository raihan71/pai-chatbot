import { createClient as createMgmtClient } from "contentful-management";

// Use legacy nested client to get convenient getSpace/getEnvironment/entry methods.
type Environment = Awaited<
  ReturnType<Awaited<ReturnType<ReturnType<typeof createMgmtClient>["getSpace"]>>["getEnvironment"]>
>;

let envPromise: Promise<Environment> | null = null;
let typesEnsured = false;

function getEnv(): Promise<Environment> {
  if (envPromise) return envPromise;
  const spaceId = process.env.CONTENTFUL_SPACE_ID;
  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  const envId = process.env.CONTENTFUL_ENVIRONMENT || "master";
  if (!spaceId) throw new Error("CONTENTFUL_SPACE_ID missing");
  if (!token) throw new Error("CONTENTFUL_MANAGEMENT_TOKEN missing");
  const client = createMgmtClient({ accessToken: token }, { type: "legacy" });
  envPromise = client.getSpace(spaceId).then((s) => s.getEnvironment(envId));
  return envPromise;
}

async function ensureContentType(
  env: Environment,
  id: string,
  name: string,
  fields: Array<{ id: string; name: string; type: string; required?: boolean }>,
  displayField: string,
) {
  try {
    const ct = await env.getContentType(id);
    // already exists
    if (!ct.fields.length) {
      // no fields — recreate
    }
    return;
  } catch {
    // not found, create
  }
  const ct = await env.createContentTypeWithId(id, {
    name,
    displayField,
    fields: fields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      required: f.required ?? false,
      localized: false,
    })),
  });
  await ct.publish();
}

async function ensureTypes(env: Environment) {
  if (typesEnsured) return;
  await ensureContentType(
    env,
    "chatMessage",
    "Chat Message",
    [
      { id: "userId", name: "User ID", type: "Symbol", required: true },
      { id: "userName", name: "User Name", type: "Symbol" },
      { id: "userEmail", name: "User Email", type: "Symbol" },
      { id: "sessionId", name: "Session ID", type: "Symbol", required: true },
      { id: "sessionTitle", name: "Session Title", type: "Symbol" },
      { id: "role", name: "Role", type: "Symbol", required: true },
      { id: "content", name: "Content", type: "Text", required: true },
      { id: "messageOrder", name: "Message Order", type: "Integer", required: true },
      { id: "createdAt", name: "Created At", type: "Date", required: true },
    ],
    "sessionTitle",
  );
  await ensureContentType(
    env,
    "userUsage",
    "User Usage",
    [
      { id: "userId", name: "User ID", type: "Symbol", required: true },
      { id: "userEmail", name: "User Email", type: "Symbol" },
      { id: "totalQuestions", name: "Total Questions", type: "Integer", required: true },
      { id: "questionLimit", name: "Question Limit", type: "Integer", required: true },
      { id: "updatedAt", name: "Updated At", type: "Date", required: true },
    ],
    "userId",
  );
  typesEnsured = true;
}

export async function getReadyEnv() {
  const env = await getEnv();
  await ensureTypes(env);
  return env;
}

const F = (v: unknown) => ({ "en-US": v });

export interface SavedMessage {
  id: string;
  userId: string;
  sessionId: string;
  sessionTitle: string;
  role: "user" | "assistant";
  content: string;
  messageOrder: number;
  createdAt: string;
}

export async function saveMessage(input: {
  userId: string;
  userName?: string;
  userEmail?: string;
  sessionId: string;
  sessionTitle: string;
  role: "user" | "assistant";
  content: string;
  messageOrder: number;
}): Promise<SavedMessage> {
  const env = await getReadyEnv();
  const createdAt = new Date().toISOString();
  const entry = await env.createEntry("chatMessage", {
    fields: {
      userId: F(input.userId),
      userName: F(input.userName ?? ""),
      userEmail: F(input.userEmail ?? ""),
      sessionId: F(input.sessionId),
      sessionTitle: F(input.sessionTitle),
      role: F(input.role),
      content: F(input.content),
      messageOrder: F(input.messageOrder),
      createdAt: F(createdAt),
    },
  });
  await entry.publish();
  return {
    id: entry.sys.id,
    userId: input.userId,
    sessionId: input.sessionId,
    sessionTitle: input.sessionTitle,
    role: input.role,
    content: input.content,
    messageOrder: input.messageOrder,
    createdAt,
  };
}

export async function listUserMessages(userId: string): Promise<SavedMessage[]> {
  const env = await getReadyEnv();
  const entries = await env.getEntries({
    content_type: "chatMessage",
    "fields.userId": userId,
    order: "fields.createdAt",
    limit: 500,
  });
  return entries.items.map((e) => ({
    id: e.sys.id,
    userId: e.fields.userId?.["en-US"] as string,
    sessionId: e.fields.sessionId?.["en-US"] as string,
    sessionTitle: (e.fields.sessionTitle?.["en-US"] as string) ?? "",
    role: e.fields.role?.["en-US"] as "user" | "assistant",
    content: e.fields.content?.["en-US"] as string,
    messageOrder: (e.fields.messageOrder?.["en-US"] as number) ?? 0,
    createdAt: e.fields.createdAt?.["en-US"] as string,
  }));
}

export async function listSessionMessages(
  userId: string,
  sessionId: string,
): Promise<SavedMessage[]> {
  const all = await listUserMessages(userId);
  return all
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.messageOrder - b.messageOrder);
}

export const DEFAULT_LIMIT = 5;

export interface UsageRecord {
  totalQuestions: number;
  limit: number;
  entryId?: string;
}

export async function getUsage(userId: string): Promise<UsageRecord> {
  const env = await getReadyEnv();
  const entries = await env.getEntries({
    content_type: "userUsage",
    "fields.userId": userId,
    limit: 1,
  });
  if (entries.items.length === 0) {
    return { totalQuestions: 0, limit: DEFAULT_LIMIT };
  }
  const e = entries.items[0];
  return {
    totalQuestions: (e.fields.totalQuestions?.["en-US"] as number) ?? 0,
    limit: (e.fields.questionLimit?.["en-US"] as number) ?? DEFAULT_LIMIT,
    entryId: e.sys.id,
  };
}

export async function incrementUsage(userId: string, userEmail?: string): Promise<UsageRecord> {
  const env = await getReadyEnv();
  const current = await getUsage(userId);
  const next = current.totalQuestions + 1;
  const updatedAt = new Date().toISOString();
  if (current.entryId) {
    const entry = await env.getEntry(current.entryId);
    entry.fields.totalQuestions = F(next);
    entry.fields.updatedAt = F(updatedAt);
    if (userEmail) entry.fields.userEmail = F(userEmail);
    const updated = await entry.update();
    await updated.publish();
  } else {
    const entry = await env.createEntry("userUsage", {
      fields: {
        userId: F(userId),
        userEmail: F(userEmail ?? ""),
        totalQuestions: F(next),
        questionLimit: F(DEFAULT_LIMIT),
        updatedAt: F(updatedAt),
      },
    });
    await entry.publish();
  }
  return { totalQuestions: next, limit: current.limit };
}
