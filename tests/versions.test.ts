import { beforeAll, describe, expect, it } from "bun:test";
import {
  WrenError,
  WrenNotFoundError,
  WrenVersionMismatchError,
  type WrenClient,
} from "../src/index.ts";
import { createUser, uid, uploadAsset } from "./helpers.ts";

// Server 0.9/0.10: unchanged writes, conditional writes, undelete, label removal,
// restore to a label, deep/label diffs, schema PATCH and files by name.
let wren: WrenClient;
let apiKey: string;

beforeAll(async () => {
  ({ client: wren, apiKey } = await createUser("versions"));
});

describe("unchanged writes", () => {
  it("update with the same data creates no version; force does", async () => {
    const col = `same-${uid()}`;
    const doc = await wren.documents.create(col, { a: 1, b: { c: [1, 2] } });
    const again = await wren.documents.update(col, doc.id, { b: { c: [1, 2] }, a: 1 });
    expect(again).toMatchObject({ version: 1, unchanged: true });
    const forced = await wren.documents.update(col, doc.id, { a: 1, b: { c: [1, 2] } }, { force: true });
    expect(forced.version).toBe(2);
    expect(forced.unchanged).toBeUndefined();
  });

  it("upsertByKey with the same data is unchanged; force writes a version", async () => {
    const col = `samek-${uid()}`;
    await wren.collections.setSchema(col, { naturalKey: "slug" });
    await wren.documents.upsertByKey(col, "x1", { slug: "x1", n: 1 });
    const again = await wren.documents.upsertByKey(col, "x1", { n: 1, slug: "x1" });
    expect(again).toMatchObject({ version: 1, unchanged: true, naturalKey: "x1" });
    expect((await wren.documents.upsertByKey(col, "x1", { slug: "x1", n: 1 }, { force: true })).version).toBe(2);
  });
});

describe("conditional writes", () => {
  it("update with a stale ifVersion throws WrenVersionMismatchError with currentVersion", async () => {
    const col = `cond-${uid()}`;
    const doc = await wren.documents.create(col, { n: 1 });
    expect((await wren.documents.update(col, doc.id, { n: 2 }, { ifVersion: 1 })).version).toBe(2);
    const err = await wren.documents.update(col, doc.id, { n: 3 }, { ifVersion: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(WrenVersionMismatchError);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(412);
    expect(err.currentVersion).toBe(2);
    expect(err.message).toContain("version 2");
    expect((await wren.documents.get(col, doc.id)).data).toEqual({ n: 2 });
  });

  it("delete and deleteByKey honor ifVersion", async () => {
    const col = `conddel-${uid()}`;
    await wren.collections.setSchema(col, { naturalKey: "sku" });
    const doc = await wren.documents.create(col, { n: 1 });
    await wren.documents.update(col, doc.id, { n: 2 });
    expect(await wren.documents.delete(col, doc.id, { ifVersion: 1 }).catch((e) => e)).toBeInstanceOf(WrenVersionMismatchError);
    expect(await wren.documents.delete(col, doc.id, { ifVersion: 2 })).toEqual({ id: doc.id, deleted: true });

    await wren.documents.upsertByKey(col, "k1", { sku: "k1" });
    const stale = await wren.documents.deleteByKey(col, "k1", { ifVersion: 2 }).catch((e) => e);
    expect(stale).toBeInstanceOf(WrenVersionMismatchError);
    expect(stale.currentVersion).toBe(1);
    expect((await wren.documents.deleteByKey(col, "k1", { ifVersion: 1 })).deleted).toBe(true);
  });

  it("upsertByKey: ifVersion 0 only creates, '*' only updates", async () => {
    const col = `condkey-${uid()}`;
    await wren.collections.setSchema(col, { naturalKey: "sku" });
    expect((await wren.documents.upsertByKey(col, "a1", { sku: "a1", qty: 5 }, { ifVersion: 0 })).version).toBe(1);
    const again = await wren.documents.upsertByKey(col, "a1", { sku: "a1", qty: 0 }, { ifVersion: 0 }).catch((e) => e);
    expect(again).toBeInstanceOf(WrenVersionMismatchError);
    expect(again.currentVersion).toBe(1);
    const missing = await wren.documents.upsertByKey(col, "b2", { sku: "b2" }, { ifVersion: "*" }).catch((e) => e);
    expect(missing).toBeInstanceOf(WrenVersionMismatchError);
    expect(missing.currentVersion).toBe(0);
    expect((await wren.documents.upsertByKey(col, "a1", { sku: "a1", qty: 4 }, { ifVersion: "*" })).version).toBe(2);
  });

  it("a 412 body without currentVersion reports 0", () => {
    expect(new WrenVersionMismatchError({ error: "Version mismatch" }).currentVersion).toBe(0);
    expect(new WrenVersionMismatchError(null).currentVersion).toBe(0);
  });
});

describe("undelete and label removal", () => {
  it("undelete brings a document back with its history", async () => {
    const col = `undel-${uid()}`;
    const doc = await wren.documents.create(col, { v: 1 });
    await wren.documents.update(col, doc.id, { v: 2 });
    await wren.documents.delete(col, doc.id);
    expect(await wren.documents.undelete(col, doc.id)).toEqual({ id: doc.id, undeleted: true, version: 2 });
    expect((await wren.documents.get(col, doc.id)).data).toEqual({ v: 2 });
    expect(await wren.documents.undelete(col, doc.id).catch((e) => e)).toBeInstanceOf(WrenNotFoundError);
  });

  it("labels.remove removes a label; removing it again throws WrenNotFoundError", async () => {
    const col = `unlab-${uid()}`;
    const doc = await wren.documents.create(col, { v: 1 });
    await wren.labels.set(col, doc.id, "snap shot");
    expect(await wren.labels.remove(col, doc.id, "snap shot")).toEqual({ id: doc.id, label: "snap shot", removed: true, version: 1 });
    expect(await wren.labels.remove(col, doc.id, "snap shot").catch((e) => e)).toBeInstanceOf(WrenNotFoundError);
  });
});

describe("restore to a label", () => {
  it("documents.restore puts a collection back; deleteUnlabeled removes new documents", async () => {
    const col = `rest-${uid()}`;
    const a = await wren.documents.create(col, { name: "a1" });
    const b = await wren.documents.create(col, { name: "b1" });
    const c = await wren.documents.create(col, { name: "c1" });
    for (const d of [a, b, c]) await wren.labels.set(col, d.id, "fixture");
    await wren.documents.update(col, a.id, { name: "a2" });
    await wren.documents.delete(col, b.id);
    const made = await wren.documents.create(col, { name: "made by the test" });

    const res = await wren.documents.restore(col, { label: "fixture", deleteUnlabeled: true });
    expect(res).toEqual({ label: "fixture", restored: 1, undeleted: 1, deleted: 1, unchanged: 1, collections: [col] });
    expect((await wren.documents.get(col, a.id)).data).toEqual({ name: "a1" });
    expect((await wren.documents.get(col, b.id)).data).toEqual({ name: "b1" });
    expect(await wren.documents.get(col, made.id).catch((e) => e)).toBeInstanceOf(WrenNotFoundError);

    // without deleteUnlabeled, documents without the label stay
    const e = await wren.documents.create(col, { name: "e" });
    expect(await wren.documents.restore(col, { label: "fixture" })).toMatchObject({ restored: 0, deleted: 0, unchanged: 3 });
    expect((await wren.documents.get(col, e.id)).data).toEqual({ name: "e" });
    expect(await wren.documents.restore(col, { label: "nope" }).catch((x) => x)).toBeInstanceOf(WrenNotFoundError);
  });

  it("trees.restore puts every mounted document back, files included", async () => {
    const tree = `rt-${uid()}`, col = `rtpages-${uid()}`, files = `rtfiles-${uid()}`;
    const page = await wren.documents.create(col, { title: "v1" });
    const file = await uploadAsset(apiKey, files, "site.css", "css v1");
    await wren.trees.assign(tree, "/index.json", page.id);
    await wren.trees.assign(tree, "/site.css", file.id);
    await wren.trees.promote(tree, { label: "release-1" });
    await wren.documents.update(col, page.id, { title: "v2" });

    const res = await wren.trees.restore(tree, { label: "release-1" });
    expect(res).toMatchObject({ tree, label: "release-1", restored: 1, unchanged: 1, collections: [col] });
    expect((await wren.documents.get(col, page.id)).data).toEqual({ title: "v1" });
  });
});

describe("diff", () => {
  it("takes labels for versions and reports nested changes with deep", async () => {
    const col = `diff-${uid()}`;
    const doc = await wren.documents.create(col, { a: { b: 1, c: [1, 2] }, x: 1 });
    await wren.labels.set(col, doc.id, "before");
    await wren.documents.update(col, doc.id, { a: { b: 2, c: [1, 2, 3] }, x: 1 });

    const shallow = await wren.diff.compare(col, doc.id, "before", 2);
    expect(shallow.v1).toBe(1);
    expect(shallow.diff.map((d) => d.path)).toEqual(["/a"]);

    const deep = await wren.diff.compare(col, doc.id, "before", 2, { deep: true });
    expect(deep.diff).toEqual(expect.arrayContaining([
      { op: "replace", path: "/a/b", value: 2, oldValue: 1 },
      { op: "add", path: "/a/c/2", value: 3 },
    ]));
    expect(deep.diff).toHaveLength(2);
    expect(await wren.diff.compare(col, doc.id, "nope", 2).catch((e) => e)).toBeInstanceOf(WrenNotFoundError);
  });
});

describe("collections.patchSchema", () => {
  it("changes only the given fields; null clears one", async () => {
    const col = `patch-${uid()}`;
    await wren.collections.setSchema(col, { schema: { type: "object", required: ["sku"] }, displayName: "Stock", listColumns: ["sku"] });
    await wren.documents.create(col, { sku: "p1" });
    const res = await wren.collections.patchSchema(col, { naturalKey: "sku" });
    expect(res).toMatchObject({ naturalKey: "sku", displayName: "Stock", listColumns: ["sku"], keysRegistered: 1, schema: { required: ["sku"] } });
    expect(await wren.collections.patchSchema(col, { displayName: null })).toMatchObject({ displayName: null, naturalKey: "sku" });
  });

  it("rejects unknown fields", async () => {
    const err = await wren.collections.patchSchema(`patch-${uid()}`, { naturalkey: "sku" } as never).catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(400);
  });
});

describe("files by name", () => {
  const text = (buf: ArrayBuffer) => new TextDecoder().decode(buf);

  it("uploadByName creates, dedupes and versions; downloadByName reads any version", async () => {
    const col = `byname-${uid()}`;
    await wren.collections.patchSchema(col, { collectionType: "binary", naturalKey: "filename" });

    const created = await wren.files.uploadByName(col, "logo.svg", "<svg>1</svg>");
    expect(created).toMatchObject({ version: 1, naturalKey: "logo.svg", data: { filename: "logo.svg" } });
    const same = await wren.files.uploadByName(col, "logo.svg", new TextEncoder().encode("<svg>1</svg>"));
    expect(same).toMatchObject({ version: 1, unchanged: true });
    await wren.labels.set(col, created.id, "v1");
    const next = await wren.files.uploadByName(col, "logo.svg", new Blob(["<svg>2</svg>"], { type: "image/svg+xml" }));
    expect(next).toMatchObject({ id: created.id, version: 2 });

    expect(text(await wren.files.downloadByName(col, "logo.svg"))).toBe("<svg>2</svg>");
    expect(text(await wren.files.downloadByName(col, "logo.svg", { version: 1 }))).toBe("<svg>1</svg>");
    expect(text(await wren.files.downloadByName(col, "logo.svg", { label: "v1" }))).toBe("<svg>1</svg>");
    expect(await wren.files.downloadByName(col, "missing.svg").catch((e) => e)).toBeInstanceOf(WrenNotFoundError);
  });

  it("uploadByName honors ifVersion and an explicit contentType", async () => {
    const col = `byname-${uid()}`;
    await wren.collections.patchSchema(col, { collectionType: "binary", naturalKey: "filename" });
    const bytes = new TextEncoder().encode("a,b\n1,2\n");
    expect((await wren.files.uploadByName(col, "data.csv", bytes.buffer, { ifVersion: 0, contentType: "text/csv" })).version).toBe(1);
    const err = await wren.files.uploadByName(col, "data.csv", "a,b\n3,4\n", { ifVersion: 0 }).catch((e) => e);
    expect(err).toBeInstanceOf(WrenVersionMismatchError);
    expect(err.currentVersion).toBe(1);
    expect((await wren.files.uploadByName(col, "data.csv", "a,b\n3,4\n", { ifVersion: 1 })).version).toBe(2);
  });

  it("without a filename key, uploadByName explains how to set one up", async () => {
    const err = await wren.files.uploadByName(`nokey-${uid()}`, "a.txt", "x").catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(400);
    expect(JSON.stringify(err.body)).toContain("naturalKey");
  });
});
