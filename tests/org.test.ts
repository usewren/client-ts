import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  WrenClient,
  WrenError,
  WrenForbiddenError,
  WrenNotFoundError,
  WrenUnauthorizedError,
} from "../src/index.ts";
import { createKeyInOrg, createUser, publicGet, uid, uploadAsset, WREN_URL, type TestUser } from "./helpers.ts";

let owner: TestUser;
let member: TestUser;

beforeAll(async () => {
  owner = await createUser("owner");
  member = await createUser("member");
});

describe("auth", () => {
  it("a client without an API key gets WrenUnauthorizedError", async () => {
    const anon = new WrenClient({ baseUrl: WREN_URL });
    const err = await anon.collections.list().catch((e) => e);
    expect(err).toBeInstanceOf(WrenUnauthorizedError);
    expect(err.status).toBe(401);
    expect(err.name).toBe("WrenUnauthorizedError");
  });

  it("an invalid API key gets WrenUnauthorizedError", async () => {
    const bad = new WrenClient({ baseUrl: WREN_URL, apiKey: "wren_not-a-real-key" });
    await expect(bad.documents.list("anything")).rejects.toBeInstanceOf(WrenUnauthorizedError);
  });

  it("a trailing slash on baseUrl is ignored", async () => {
    const c = new WrenClient({ baseUrl: `${WREN_URL}/`, apiKey: owner.apiKey });
    const { collections } = await c.collections.list();
    expect(Array.isArray(collections)).toBe(true);
  });
});

describe("keys", () => {
  it("create / list / revoke; a revoked key stops working", async () => {
    const created = await owner.client.keys.create("ci deploy");
    expect(created.key).toStartWith("wren_");
    expect(created.name).toBe("ci deploy");
    expect(created.keyPrefix).toBe(created.key.slice(0, 12));

    const { keys } = await owner.client.keys.list();
    const listed = keys.find((k) => k.id === created.id);
    expect(listed).toBeDefined();
    expect((listed as Record<string, unknown>).key).toBeUndefined();
    expect(listed!.revokedAt).toBeNull();

    const fresh = new WrenClient({ baseUrl: WREN_URL, apiKey: created.key });
    await fresh.collections.list();

    expect(await owner.client.keys.revoke(created.id)).toEqual({ id: created.id, revoked: true });
    await expect(fresh.collections.list()).rejects.toBeInstanceOf(WrenUnauthorizedError);
  });

  it("revoke of an unknown key throws WrenNotFoundError", async () => {
    await expect(owner.client.keys.revoke("00000000-0000-0000-0000-000000000000")).rejects.toBeInstanceOf(
      WrenNotFoundError,
    );
  });

  it("create without a name throws WrenError(400)", async () => {
    const err = await owner.client.keys.create("").catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(400);
  });
});

describe("invites, members and permissions", () => {
  let orgId: string;
  let memberClient: WrenClient;
  const col = `shared-${uid()}`;

  beforeAll(async () => {
    orgId = owner.userId; // a user's own org has the user's id
  });

  it("invites.create returns a token once; listSent shows it", async () => {
    const inv = await owner.client.invites.create(member.email, "member");
    expect(inv.token).toBeTruthy();
    expect(inv.email).toBe(member.email);
    expect(inv.role).toBe("member");
    const { invites } = await owner.client.invites.listSent();
    const listed = invites.find((i) => i.id === inv.id);
    expect(listed).toBeDefined();
    expect((listed as Record<string, unknown>).token).toBeUndefined();

    const accepted = await member.client.invites.accept(inv.token);
    expect(accepted).toEqual({ accepted: true, orgId });
  });

  it("accepting a revoked invite throws WrenError(410)", async () => {
    const inv = await owner.client.invites.create(`again-${uid()}@client-tests.example`);
    expect(inv.role).toBe("member"); // default role
    await owner.client.invites.revoke(inv.id);
    const err = await member.client.invites.accept(inv.token).catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(410); // revoked
  });

  it("invites.revoke marks the invite revoked", async () => {
    const inv = await owner.client.invites.create(`revoke-${uid()}@client-tests.example`);
    expect(await owner.client.invites.revoke(inv.id)).toEqual({ id: inv.id, revoked: true });
    const { invites } = await owner.client.invites.listSent();
    expect(invites.find((i) => i.id === inv.id)?.revokedAt).toBeTruthy();
  });

  it("listReceived is empty until the email is verified", async () => {
    const res = await member.client.invites.listReceived();
    expect(res.invites).toEqual([]);
  });

  it("acceptById requires a verified email (WrenForbiddenError)", async () => {
    const inv = await owner.client.invites.create(member.email);
    const err = await member.client.invites.acceptById(inv.id).catch((e) => e);
    expect(err).toBeInstanceOf(WrenForbiddenError);
    expect(err.status).toBe(403);
    await owner.client.invites.revoke(inv.id);
  });

  it("members.list includes the accepted member", async () => {
    const { members } = await owner.client.members.list();
    const m = members.find((x) => x.userId === member.userId);
    expect(m).toMatchObject({ email: member.email, role: "member" });
    expect(m!.joinedAt).toBeTruthy();
  });

  it("a member without rules is forbidden from org data", async () => {
    await owner.client.documents.create(col, { title: "secret" });
    const key = await createKeyInOrg(member, orgId);
    memberClient = new WrenClient({ baseUrl: WREN_URL, apiKey: key.key });
    const err = await memberClient.documents.list(col).catch((e) => e);
    expect(err).toBeInstanceOf(WrenForbiddenError);
    expect(err.message).toBe("Forbidden");
  });

  it("permissions.create grants read; writes stay forbidden", async () => {
    const perm = await owner.client.permissions.create({
      principal: `member:${member.userId}`,
      resource: `collection:${col}`,
      access: "read",
      auditReads: true,
    });
    expect(perm).toMatchObject({ principal: `member:${member.userId}`, resource: `collection:${col}`, access: "read" });

    const list = await memberClient.documents.list(col);
    expect(list.total).toBe(1);
    await expect(memberClient.documents.create(col, { title: "nope" })).rejects.toBeInstanceOf(WrenForbiddenError);

    const { permissions } = await owner.client.permissions.list();
    expect(permissions.find((p) => p.id === perm.id)?.auditReads).toBe(true);
  });

  it("permissions.update changes access; permissions.delete removes the rule", async () => {
    const { permissions } = await owner.client.permissions.list();
    const perm = permissions.find((p) => p.resource === `collection:${col}`)!;
    const updated = await owner.client.permissions.update(perm.id, { access: "write" });
    expect(updated.access).toBe("write");
    const doc = await memberClient.documents.create(col, { title: "member wrote this" });
    expect(doc.version).toBe(1);

    expect(await owner.client.permissions.delete(perm.id)).toEqual({ id: perm.id, deleted: true });
    await expect(memberClient.documents.list(col)).rejects.toBeInstanceOf(WrenForbiddenError);
  });

  it("permissions.update with an invalid access throws WrenError(400)", async () => {
    const perm = await owner.client.permissions.create({ principal: "*", resource: `collection:x-${uid()}`, access: "read" });
    const err = await owner.client.permissions.update(perm.id, { access: "everything" as never }).catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(400);
    await owner.client.permissions.delete(perm.id);
  });

  it("members (non-admin) cannot manage permissions", async () => {
    await expect(
      memberClient.permissions.create({ principal: "*", resource: "*", access: "admin" }),
    ).rejects.toBeInstanceOf(WrenForbiddenError);
  });

  it("members.remove removes the member and their access", async () => {
    expect(await owner.client.members.remove(member.userId)).toEqual({ userId: member.userId, removed: true });
    const { members } = await owner.client.members.list();
    expect(members.find((m) => m.userId === member.userId)).toBeUndefined();
    await expect(memberClient.documents.list(col)).rejects.toBeInstanceOf(WrenError);
  });
});

describe("public access", () => {
  it("a principal='*' rule with labelFilter exposes only labeled versions", async () => {
    const col = `public-${uid()}`;
    const a = await owner.client.documents.create(col, { title: "published one" });
    await owner.client.documents.create(col, { title: "draft" });

    // Nothing is public by default
    expect((await publicGet(`/api/v1/orgs/${owner.slug}/${col}`)).status).toBe(403);

    const perm = await owner.client.permissions.create({
      principal: "*",
      resource: `collection:${col}`,
      access: "read",
      labelFilter: "published",
    });
    expect(perm.labelFilter).toBe("published");
    await owner.client.labels.set(col, a.id, "published");
    await owner.client.documents.update(col, a.id, { title: "unpublished edit" });

    const res = await publicGet(`/api/v1/orgs/${owner.slug}/${col}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { id: string; data: { title: string } }[] };
    expect(body.items.map((i) => i.id)).toEqual([a.id]);
    expect(body.items[0]!.data.title).toBe("published one");
  });
});

describe("webhooks", () => {
  it("create / list / update / deliveries / replay / delete", async () => {
    const created = await owner.client.webhooks.create("http://localhost:9/hook", { events: ["document.created"] });
    expect(created.secret).toBeTruthy();
    expect(created.events).toEqual(["document.created"]);
    expect(created.enabled).toBe(true);

    const { webhooks } = await owner.client.webhooks.list();
    expect(webhooks.find((w) => w.id === created.id)?.url).toBe("http://localhost:9/hook");

    await owner.client.webhooks.update(created.id, { enabled: false, events: [] });
    const after = (await owner.client.webhooks.list()).webhooks.find((w) => w.id === created.id)!;
    expect(after.enabled).toBe(false);
    expect(after.events).toEqual([]);

    const { deliveries } = await owner.client.webhooks.deliveries(created.id);
    expect(Array.isArray(deliveries)).toBe(true);

    await owner.client.documents.create(`hooked-${uid()}`, { title: "event" });
    const replay = await owner.client.webhooks.replay(created.id, { since: "2000-01-01T00:00:00Z" });
    expect(typeof replay.replayed).toBe("number");

    expect(await owner.client.webhooks.delete(created.id)).toEqual({ id: created.id, deleted: true });
    await expect(owner.client.webhooks.deliveries(created.id)).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("webhooks.update resolves to { id, updated: true }", async () => {
    const created = await owner.client.webhooks.create("http://localhost:9/typed");
    const updated = await owner.client.webhooks.update(created.id, { enabled: false });
    expect(updated).toEqual({ id: created.id, updated: true });
    const after = (await owner.client.webhooks.list()).webhooks.find((w) => w.id === created.id)!;
    expect(after.enabled).toBe(false);
    expect(after.url).toBe("http://localhost:9/typed");
    await owner.client.webhooks.delete(created.id);
  });

  it("create without events subscribes to all", async () => {
    const created = await owner.client.webhooks.create("http://localhost:9/all");
    expect(created.events).toEqual([]);
    await owner.client.webhooks.delete(created.id);
  });

  it("create with a private address throws WrenError(400)", async () => {
    const err = await owner.client.webhooks.create("http://10.0.0.1/hook").catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(400);
  });
});

describe("binary assets (via request())", () => {
  it("request() returns non-JSON bodies as text", async () => {
    const col = `files-${uid()}`;
    await owner.client.collections.setSchema(col, { collectionType: "binary" });
    const asset = await uploadAsset(owner.apiKey, col, "hello.txt", "hello world");
    const raw = await owner.client.request<string>("GET", `/${col}/${asset.id}/raw`);
    expect(raw).toBe("hello world");
  });
});

describe("error mapping", () => {
  // A tiny local stub serves bodies the real server never sends, to pin down
  // how every status and body shape maps to an error class.
  let server: ReturnType<typeof Bun.serve>;
  let stub: WrenClient;

  beforeAll(() => {
    server = Bun.serve({
      port: 0,
      fetch(req) {
        const kind = new URL(req.url).pathname.split("/").pop();
        switch (kind) {
          case "errors": return Response.json({ errors: ["a: bad", { path: "/b" }] }, { status: 422 });
          case "message": return Response.json({ message: "nope" }, { status: 422 });
          case "error": return Response.json({ error: "Schema validation failed" }, { status: 422 });
          case "details": return Response.json({ error: "Invalid JSON Schema", details: "bad type" }, { status: 422 });
          case "empty": return Response.json({}, { status: 422 });
          case "text422": return new Response("plain", { status: 422 });
          case "teapot": return new Response("short and stout", { status: 418 });
          case "conflict": return Response.json({ error: "taken" }, { status: 409 });
          default: return Response.json({ ok: true, auth: req.headers.get("authorization") });
        }
      },
    });
    stub = new WrenClient({ baseUrl: `http://localhost:${server.port}`, apiKey: "wren_stub" });
  });

  afterAll(() => server.stop(true));

  it("sends the API key as a Bearer token", async () => {
    expect(await stub.request("GET", "/ok")).toEqual({ ok: true, auth: "Bearer wren_stub" });
  });

  it("422 details come from details, errors[], message or error", async () => {
    const e1 = await stub.request("GET", "/errors").catch((e) => e);
    expect(e1.details).toEqual(["a: bad", '{"path":"/b"}']);
    const e2 = await stub.request("GET", "/message").catch((e) => e);
    expect(e2.details).toEqual(["nope"]);
    const e3 = await stub.request("GET", "/error").catch((e) => e);
    expect(e3.details).toEqual(["Schema validation failed"]);
    const e6 = await stub.request("GET", "/details").catch((e) => e);
    expect(e6.details).toEqual(["bad type"]);
    const e4 = await stub.request("GET", "/empty").catch((e) => e);
    expect(e4.details).toEqual([]);
    const e5 = await stub.request("GET", "/text422").catch((e) => e);
    expect(e5.details).toEqual([]);
    expect(e5.body).toBe("plain");
  });

  it("other statuses become a plain WrenError with the body", async () => {
    const teapot = await stub.request("GET", "/teapot").catch((e) => e);
    expect(teapot).toBeInstanceOf(WrenError);
    expect(teapot.status).toBe(418);
    expect(teapot.body).toBe("short and stout");
    const conflict = await stub.request("GET", "/conflict").catch((e) => e);
    expect(conflict.status).toBe(409);
    expect(conflict.body).toEqual({ error: "taken" });
  });
});
