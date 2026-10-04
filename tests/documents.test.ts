import { beforeAll, describe, expect, it } from "bun:test";
import { WrenNotFoundError, type WrenClient } from "../src/index.ts";
import { createUser, uid } from "./helpers.ts";

let wren: WrenClient;
const col = `articles-${uid()}`;

beforeAll(async () => {
  ({ client: wren } = await createUser("docs"));
});

describe("documents", () => {
  it("create returns a DocumentResponse at version 1", async () => {
    const doc = await wren.documents.create(col, { title: "Hello", category: "news" });
    expect(doc.collection).toBe(col);
    expect(typeof doc.id).toBe("string");
    expect(doc.version).toBe(1);
    expect(doc.data).toEqual({ title: "Hello", category: "news" });
    // Note: the create response carries no `labels` (the server omits it), so
    // labels are checked on a get below.
    expect(doc.createdAt).toBeTruthy();
    expect(doc.updatedAt).toBeTruthy();
  });

  it("get returns the current version", async () => {
    const created = await wren.documents.create(col, { title: "Get me" });
    const doc = await wren.documents.get(col, created.id);
    expect(doc.id).toBe(created.id);
    expect(doc.data.title).toBe("Get me");
    expect(Array.isArray(doc.labels)).toBe(true);
  });

  it("update creates a new version", async () => {
    const created = await wren.documents.create(col, { title: "v1" });
    const updated = await wren.documents.update(col, created.id, { title: "v2" });
    expect(updated.id).toBe(created.id);
    expect(updated.version).toBe(2);
    expect(updated.data.title).toBe("v2");
  });

  it("delete soft-deletes; a later get throws WrenNotFoundError", async () => {
    const created = await wren.documents.create(col, { title: "doomed" });
    const res = await wren.documents.delete(col, created.id);
    expect(res).toEqual({ id: created.id, deleted: true });
    const err = await wren.documents.get(col, created.id).catch((e) => e);
    expect(err).toBeInstanceOf(WrenNotFoundError);
    expect(err.status).toBe(404);
  });

  it("list returns items, total and honors limit", async () => {
    const listCol = `list-${uid()}`;
    for (let i = 0; i < 3; i++) await wren.documents.create(listCol, { n: i, kind: i % 2 ? "odd" : "even" });
    const all = await wren.documents.list(listCol);
    expect(all.collection).toBe(listCol);
    expect(all.total).toBe(3);
    expect(all.items).toHaveLength(3);

    const limited = await wren.documents.list(listCol, { limit: 2 });
    expect(limited.items).toHaveLength(2);
  });

  it("list passes where and select through", async () => {
    const listCol = `where-${uid()}`;
    await wren.documents.create(listCol, { title: "a", kind: "odd" });
    await wren.documents.create(listCol, { title: "b", kind: "even" });
    const res = await wren.documents.list(listCol, { where: "kind:odd", select: "title" });
    expect(res.items).toHaveLength(1);
    expect(res.items[0]!.data).toEqual({ title: "a" });
  });

  it("list and get honor a label", async () => {
    const listCol = `label-${uid()}`;
    const a = await wren.documents.create(listCol, { title: "draft" });
    await wren.documents.create(listCol, { title: "other" });
    await wren.labels.set(listCol, a.id, "published");
    await wren.documents.update(listCol, a.id, { title: "newer draft" });

    const published = await wren.documents.list(listCol, { label: "published" });
    expect(published.items.map((d) => d.id)).toEqual([a.id]);
    expect(published.items[0]!.data.title).toBe("draft");

    const atLabel = await wren.documents.get(listCol, a.id, { label: "published" });
    expect(atLabel.version).toBe(1);
    expect(atLabel.data.title).toBe("draft");
  });

  it("list and get accept depth; list pages with limit and offset", async () => {
    const listCol = `opts-${uid()}`;
    const target = await wren.documents.create(listCol, { title: "target" });
    const ref = await wren.documents.create(listCol, { title: "ref", link: { $ref: `${listCol}/${target.id}` } });
    const withDepth = await wren.documents.get(listCol, ref.id, { depth: 1 });
    expect(withDepth.id).toBe(ref.id);
    const list = await wren.documents.list(listCol, { depth: 0 });
    expect(list.total).toBe(2);
    // Newest first: page 1 holds ref, page 2 holds target
    const page2 = await wren.documents.list(listCol, { limit: 1, offset: 1 });
    expect(page2.total).toBe(2);
    expect(page2.items.map((d) => d.id)).toEqual([target.id]);
  });

  it("getPaths lists the tree paths a document is assigned to", async () => {
    const doc = await wren.documents.create(col, { title: "in a tree" });
    const tree = `paths-${uid()}`;
    await wren.trees.assign(tree, "/blog/post", doc.id);
    const paths = await wren.documents.getPaths(col, doc.id);
    expect(paths.id).toBe(doc.id);
    expect(paths.collection).toBe(col);
    expect(paths.paths).toEqual([{ tree, path: "/blog/post" }]);
  });

  it("ids are URL-encoded", async () => {
    const err = await wren.documents.get(col, "no/such id").catch((e) => e);
    expect(err).toBeInstanceOf(WrenNotFoundError);
  });
});

describe("documents by natural key", () => {
  const keyCol = `pages-${uid()}`;

  beforeAll(async () => {
    await wren.collections.setSchema(keyCol, { naturalKey: "slug" });
  });

  it("upsertByKey creates then updates via /by-key/", async () => {
    const created = await wren.documents.upsertByKey(keyCol, "about", { slug: "about", title: "About" });
    expect(created.version).toBe(1);
    const updated = await wren.documents.upsertByKey(keyCol, "about", { slug: "about", title: "About us" });
    expect(updated.id).toBe(created.id);
    expect(updated.version).toBe(2);
  });

  it("getByKey reads the document by its natural key", async () => {
    const doc = await wren.documents.create(keyCol, { slug: "contact", title: "Contact" });
    const byKey = await wren.documents.getByKey(keyCol, "contact");
    expect(byKey.id).toBe(doc.id);
    const labeled = await wren.documents.getByKey(keyCol, "contact", { label: "published", depth: 0 }).catch((e) => e);
    expect(labeled).toBeInstanceOf(WrenNotFoundError);
  });

  it("natural-key values are URL-encoded", async () => {
    const doc = await wren.documents.upsertByKey(keyCol, "a b/c", { slug: "a b/c", title: "Odd key" });
    expect((await wren.documents.getByKey(keyCol, "a b/c")).id).toBe(doc.id);
  });

  it("deleteByKey deletes by natural key", async () => {
    const doc = await wren.documents.create(keyCol, { slug: "gone", title: "Gone" });
    const res = await wren.documents.deleteByKey(keyCol, "gone");
    expect(res).toEqual({ id: doc.id, deleted: true });
  });
});

describe("versions", () => {
  it("list returns the version history", async () => {
    const doc = await wren.documents.create(col, { title: "one" });
    await wren.documents.update(col, doc.id, { title: "two" });
    const hist = await wren.versions.list(col, doc.id);
    expect(hist.id).toBe(doc.id);
    expect(hist.collection).toBe(col);
    expect(hist.versions.map((v) => v.version).sort()).toEqual([1, 2]);
    expect(hist.versions[0]!.createdBy).toBeTruthy();
  });

  it("get returns the data at a specific version", async () => {
    const doc = await wren.documents.create(col, { title: "one" });
    await wren.documents.update(col, doc.id, { title: "two" });
    const v1 = await wren.versions.get(col, doc.id, 1);
    expect(v1.version).toBe(1);
    expect(v1.data.title).toBe("one");
  });

  it("get of a missing version throws WrenNotFoundError", async () => {
    const doc = await wren.documents.create(col, { title: "one" });
    await expect(wren.versions.get(col, doc.id, 99)).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("rollback creates a new version with the old data", async () => {
    const doc = await wren.documents.create(col, { title: "original" });
    await wren.documents.update(col, doc.id, { title: "changed" });
    const res = await wren.versions.rollback(col, doc.id, 1);
    expect(res).toEqual({ id: doc.id, version: 3, rolledBackTo: 1 });
    const current = await wren.documents.get(col, doc.id);
    expect(current.version).toBe(3);
    expect(current.data.title).toBe("original");
  });
});

describe("labels", () => {
  it("set pins the current version by default", async () => {
    const doc = await wren.documents.create(col, { title: "one" });
    await wren.documents.update(col, doc.id, { title: "two" });
    const res = await wren.labels.set(col, doc.id, "published");
    expect(res).toEqual({ id: doc.id, label: "published", version: 2 });
    const current = await wren.documents.get(col, doc.id);
    expect(current.labels).toContain("published");
  });

  it("set pins a specific version", async () => {
    const doc = await wren.documents.create(col, { title: "one" });
    await wren.documents.update(col, doc.id, { title: "two" });
    const res = await wren.labels.set(col, doc.id, "staging", 1);
    expect(res.version).toBe(1);
    const staged = await wren.documents.get(col, doc.id, { label: "staging" });
    expect(staged.data.title).toBe("one");
  });

  it("set on a missing version throws WrenNotFoundError", async () => {
    const doc = await wren.documents.create(col, { title: "one" });
    await expect(wren.labels.set(col, doc.id, "x", 42)).rejects.toBeInstanceOf(WrenNotFoundError);
  });
});

describe("diff", () => {
  it("compare returns JSON-pointer operations between two versions", async () => {
    const doc = await wren.documents.create(col, { title: "Old", draft: true });
    await wren.documents.update(col, doc.id, { title: "New", publishedAt: "2026-01-01" });
    const res = await wren.diff.compare(col, doc.id, 1, 2);
    expect(res.id).toBe(doc.id);
    expect(res.v1).toBe(1);
    expect(res.v2).toBe(2);
    const byPath = Object.fromEntries(res.diff.map((d) => [d.path, d]));
    expect(byPath["/title"]).toMatchObject({ op: "replace", value: "New", oldValue: "Old" });
    expect(byPath["/publishedAt"]).toMatchObject({ op: "add", value: "2026-01-01" });
    expect(byPath["/draft"]!.op).toBe("remove");
  });

  it("compare on a missing document throws WrenNotFoundError", async () => {
    await expect(
      wren.diff.compare(col, "00000000-0000-0000-0000-000000000000", 1, 2),
    ).rejects.toBeInstanceOf(WrenNotFoundError);
  });
});
