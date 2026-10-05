import { beforeAll, describe, expect, it } from "bun:test";
import { WrenError, WrenNotFoundError } from "../src/index.ts";
import { createUser, type TestUser } from "./helpers.ts";

let owner: TestUser;

/** A document with versions 1..n; labels map label → version. */
async function docWithVersions(collection: string, n: number, labels: Record<string, number> = {}) {
  const doc = await owner.client.documents.create(collection, { title: "v1" });
  for (let v = 2; v <= n; v++) await owner.client.documents.update(collection, doc.id, { title: `v${v}` });
  for (const [label, version] of Object.entries(labels)) await owner.client.labels.set(collection, doc.id, label, version);
  return doc;
}

beforeAll(async () => {
  owner = await createUser("retention");
});

describe("retention", () => {
  it("get: nothing set yet", async () => {
    expect(await owner.client.retention.get()).toEqual({ default: null, collections: [], runs: [] });
  });

  it("set / get / preview / apply / remove; current and labeled versions are kept", async () => {
    const a = await docWithVersions("notes", 4, { approved: 1 });
    await docWithVersions("notes", 4);
    await docWithVersions("posts", 3);

    const policy = await owner.client.retention.set("notes", { maxVersions: 2 });
    expect(policy).toMatchObject({ collection: "notes", labeledOnly: false, maxVersions: 2, maxAgeDays: null, afterLabel: null, updatedBy: owner.userId });
    expect(policy.updatedAt).toBeTruthy();
    const def = await owner.client.retention.set("*", { labeledOnly: true, maxAgeDays: 30, afterLabel: "live" });
    expect(def).toMatchObject({ collection: "*", labeledOnly: true, maxVersions: null, maxAgeDays: 30, afterLabel: "live" });
    // No rule: keeps everything (exempt from the default)
    expect(await owner.client.retention.set("archive", {})).toMatchObject({ collection: "archive", labeledOnly: false, maxVersions: null });

    const overview = await owner.client.retention.get();
    expect(overview.default?.collection).toBe("*");
    expect(overview.collections.map((c) => c.collection)).toEqual(["archive", "notes"]);

    // Saved policy: a loses v2 (v1 is labeled), b loses v1 and v2
    const saved = await owner.client.retention.preview("notes");
    expect(saved.total).toMatchObject({ versions: 3, documents: 2 });
    expect(saved.total.bytes).toBeGreaterThan(0);
    expect(saved.collections).toEqual([{ collection: "notes", ...saved.total }]);
    // Proposed rules
    expect((await owner.client.retention.preview("notes", { maxVersions: 10 })).total).toEqual({ versions: 0, documents: 0, bytes: 0 });
    // The default covers posts only (notes and archive have their own)
    const all = await owner.client.retention.preview("*");
    expect(all.collections.map((c) => [c.collection, c.versions])).toEqual([["posts", 2]]);
    expect((await owner.client.versions.get("notes", a.id, 2)).version).toBe(2);

    const applied = await owner.client.retention.apply();
    expect(applied.total).toMatchObject({ versions: 5, documents: 3 });
    expect(applied.collections.map((c) => c.collection).sort()).toEqual(["notes", "posts"]);
    await expect(owner.client.versions.get("notes", a.id, 2)).rejects.toBeInstanceOf(WrenNotFoundError);
    expect((await owner.client.versions.get("notes", a.id, 1)).version).toBe(1);
    expect((await owner.client.documents.get("notes", a.id)).version).toBe(4);

    const { runs } = await owner.client.retention.get();
    expect(runs.map((r) => [r.collection, r.versionsRemoved, r.triggeredBy]).sort()).toEqual([["notes", 3, owner.userId], ["posts", 2, owner.userId]]);
    expect(runs[0]!.bytesFreed).toBeGreaterThan(0);
    expect(runs[0]!.ranAt).toBeTruthy();
    expect((await owner.client.retention.apply()).total.versions).toBe(0);

    expect(await owner.client.retention.remove("notes")).toEqual({ collection: "notes", deleted: true });
    expect(await owner.client.retention.remove("*")).toEqual({ collection: "*", deleted: true });
    await expect(owner.client.retention.remove("notes")).rejects.toBeInstanceOf(WrenNotFoundError);
    expect((await owner.client.retention.get()).default).toBeNull();
  });

  it("invalid rules and internal collections are rejected (400)", async () => {
    const bad = await owner.client.retention.set("notes", { maxVersions: 0 }).catch((e) => e);
    expect(bad).toBeInstanceOf(WrenError);
    expect(bad.status).toBe(400);
    const internal = await owner.client.retention.preview("_events").catch((e) => e);
    expect(internal.status).toBe(400);
  });
});
