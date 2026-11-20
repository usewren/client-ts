// Shared setup for the integration tests: they run against a real WREN server
// (see tests/run-local.sh). Each test file signs up its own user, so every file
// works in its own org and the files don't interfere with each other.
import { WrenClient } from "../src/index.ts";

export const WREN_URL = (process.env.WREN_URL ?? process.env.WREN_TEST_URL ?? "http://localhost:4000").replace(/\/$/, "");

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function authPost(path: string, body: unknown, cookie?: string): Promise<Response> {
  return fetch(`${WREN_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // better-auth rejects cross-site POSTs, so send the server's own origin
      Origin: WREN_URL,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

export interface TestUser {
  email: string;
  password: string;
  cookie: string;
  apiKey: string;
  keyId: string;
  userId: string;
  slug: string;
  client: WrenClient;
}

/** Sign up a fresh user, sign in, and create an API key for their own org. */
export async function createUser(prefix = "ts"): Promise<TestUser> {
  const email = `${prefix}-${uid()}@client-tests.example`;
  const password = "correct-horse-battery-staple";
  const signUp = await authPost("/api/auth/sign-up/email", { email, password, name: `Test ${prefix}` });
  if (!signUp.ok) throw new Error(`sign-up failed: ${signUp.status} ${await signUp.text()}`);
  const signIn = await authPost("/api/auth/sign-in/email", { email, password });
  if (!signIn.ok) throw new Error(`sign-in failed: ${signIn.status} ${await signIn.text()}`);
  const cookie = decodeURIComponent(signIn.headers.get("set-cookie")?.split(";")[0] ?? "");

  const keyRes = await authPost("/api/v1/keys", { name: "client-tests" }, cookie);
  if (!keyRes.ok) throw new Error(`key creation failed: ${keyRes.status} ${await keyRes.text()}`);
  const key = (await keyRes.json()) as { id: string; key: string };

  const me = (await (await fetch(`${WREN_URL}/api/v1/me`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${key.key}` },
  })).json()) as { user: { id: string }; org: { slug: string } };

  return {
    email,
    password,
    cookie,
    apiKey: key.key,
    keyId: key.id,
    userId: me.user.id,
    slug: me.org.slug,
    client: new WrenClient({ baseUrl: WREN_URL, apiKey: key.key }),
  };
}

/**
 * Create an API key for `user` in another org they are a member of: switch the
 * session's org, create the key (keys carry the org they were created in), and
 * switch back.
 */
export async function createKeyInOrg(user: TestUser, orgId: string): Promise<{ id: string; key: string }> {
  const headers = { "Content-Type": "application/json", Accept: "application/json", Origin: WREN_URL, Cookie: user.cookie };
  const sw = await fetch(`${WREN_URL}/api/v1/org`, { method: "PUT", headers, body: JSON.stringify({ orgId }) });
  if (!sw.ok) throw new Error(`org switch failed: ${sw.status} ${await sw.text()}`);
  const res = await authPost("/api/v1/keys", { name: "member-key" }, user.cookie);
  if (!res.ok) throw new Error(`key creation failed: ${res.status} ${await res.text()}`);
  await fetch(`${WREN_URL}/api/v1/org`, { method: "PUT", headers, body: JSON.stringify({ orgId: user.userId }) });
  return (await res.json()) as { id: string; key: string };
}

/** Anonymous GET against the public API (no credentials). */
export async function publicGet(path: string): Promise<Response> {
  return fetch(`${WREN_URL}${path}`, { headers: { Accept: "application/json" } });
}

/** Upload a file to a binary collection with a plain POST (the client uploads files by name only). */
export async function uploadAsset(apiKey: string, collection: string, name: string, content: string): Promise<{ id: string }> {
  const form = new FormData();
  form.append("file", new File([content], name, { type: "text/plain" }));
  const res = await fetch(`${WREN_URL}/api/v1/${collection}`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string };
}
