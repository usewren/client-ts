import { beforeAll, describe, expect, it } from "bun:test";
import { WrenError, WrenNotFoundError, WrenValidationError, type WrenClient } from "../src/index.ts";
import { createUser, uid } from "./helpers.ts";

let wren: WrenClient;

beforeAll(async () => {
  ({ client: wren } = await createUser("cols"));
});

const titleSchema = {
  type: "object",
  required: ["title"],
  properties: { title: { type: "string" } },
};

describe("collections", () => {
  it("list returns collections with document counts", async () => {
    const col = `count-${uid()}`;
    await wren.documents.create(col, { title: "a" });
    await wren.documents.create(col, { title: "b" });
    const { collections } = await wren.collections.list();
    const info = collections.find((c) => c.name === col);
    expect(info).toBeDefined();
    expect(info!.count).toBe(2);
    expect(info!.updatedAt).toBeTruthy();
  });

  it("setSchema / getSchema round-trip every option", async () => {
    const col = `schema-${uid()}`;
    const set = await wren.collections.setSchema(col, {
      schema: titleSchema,
      displayName: "{title}",
      collectionType: "json",
      naturalKey: "slug",
      listColumns: ["title", "slug"],
      indexes: [{ path: "title", kind: "btree" }],
    });
    expect(set.collection).toBe(col);
    expect(set.schema).toEqual(titleSchema);
    expect(set.naturalKey).toBe("slug");

    const got = await wren.collections.getSchema(col);
    expect(got.collectionType).toBe("json");
    expect(got.displayName).toBe("{title}");
    expect(got.listColumns).toEqual(["title", "slug"]);
    expect(got.indexes).toEqual([{ path: "title", kind: "btree" }]);
  });

  it("getSchema on a collection without a schema throws WrenNotFoundError", async () => {
    await expect(wren.collections.getSchema(`none-${uid()}`)).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("deleteSchema removes the schema", async () => {
    const col = `del-${uid()}`;
    await wren.collections.setSchema(col, { schema: titleSchema });
    expect(await wren.collections.deleteSchema(col)).toEqual({ collection: col, deleted: true });
    await expect(wren.collections.getSchema(col)).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("a write that violates the schema throws WrenValidationError (422)", async () => {
    const col = `strict-${uid()}`;
    await wren.collections.setSchema(col, { schema: titleSchema });
    const err = await wren.documents.create(col, { nope: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(WrenValidationError);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(422);
    expect(err.body.error).toBe("Schema validation failed");
    expect(err.message).toStartWith("Validation error:");
  });

  it("WrenValidationError.details carries the server's per-field messages", async () => {
    const col = `strict-${uid()}`;
    await wren.collections.setSchema(col, { schema: titleSchema });
    const err = await wren.documents.create(col, { nope: 1 }).catch((e) => e);
    expect(err.details).toEqual(err.body.details);
  });

  it("validate checks existing documents against the current schema", async () => {
    const col = `val-${uid()}`;
    await wren.documents.create(col, { title: "ok" });
    await wren.documents.create(col, { other: 1 });
    await wren.collections.setSchema(col, { schema: { type: "object" } });
    const current = await wren.collections.validate(col);
    expect(current.schemaSource).toBe("current");
    expect(current.checked).toBe(2);
    expect(current.invalid).toBe(0);

    const proposed = await wren.collections.validate(col, titleSchema);
    expect(proposed.schemaSource).toBe("proposed");
    expect(proposed.valid).toBe(1);
    expect(proposed.invalid).toBe(1);
    expect(proposed.failures).toHaveLength(1);
    expect(proposed.failures[0]!.errors.length).toBeGreaterThan(0);
  });

  it("validate with no schema and no proposal throws WrenNotFoundError", async () => {
    await expect(wren.collections.validate(`noschema-${uid()}`)).rejects.toBeInstanceOf(WrenNotFoundError);
  });
});

describe("query", () => {
  const col = `q-${uid()}`;

  beforeAll(async () => {
    await wren.documents.create(col, { title: "a", category: "news", score: 1 });
    await wren.documents.create(col, { title: "b", category: "news", score: 2 });
    await wren.documents.create(col, { title: "c", category: "opinion", score: 3 });
  });

  it("run returns projected, filtered items", async () => {
    const res = await wren.query.run(col, { where: "category:news", select: ["title"], limit: 10 });
    expect(res.items).toHaveLength(2);
    expect(res.items!.map((i) => i.data.title).sort()).toEqual(["a", "b"]);
    expect(Object.keys(res.items![0]!.data)).toEqual(["title"]);
  });

  it("run returns a cursor and forwards one", async () => {
    const first = await wren.query.run(col, { limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.cursor).toBeTruthy();
    // Page contents are not asserted: the server orders by created_at but pages
    // by id (sandbox handleQuery), so the next page is not deterministic.
    const second = await wren.query.run(col, { limit: 2, cursor: first.cursor! });
    expect(second.items!.length).toBeLessThanOrEqual(2);
    // An undecodable cursor is rejected, which proves the client sends it.
    const err = await wren.query.run(col, { cursor: "not-a-cursor" }).catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(400);
  });

  it("run honors a label", async () => {
    const labelCol = `ql-${uid()}`;
    const a = await wren.documents.create(labelCol, { title: "a" });
    await wren.documents.create(labelCol, { title: "b" });
    await wren.labels.set(labelCol, a.id, "published");
    const res = await wren.query.run(labelCol, { label: "published" });
    expect(res.items!.map((i) => i.id)).toEqual([a.id]);
  });

  it("run aggregates into rows", async () => {
    const res = await wren.query.run(col, {
      aggregate: { groupBy: ["category"], metrics: { n: { count: "title" }, total: { sum: "score" } } },
    });
    const rows = Object.fromEntries(res.rows!.map((r) => [(r.key as { category: string }).category, r]));
    expect(rows.news).toMatchObject({ n: 2, total: 3 });
    expect(rows.opinion).toMatchObject({ n: 1, total: 3 });
  });

  it("run with an invalid path throws WrenError(400)", async () => {
    const err = await wren.query.run(col, { select: ["bad path!"] }).catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Request failed with status 400");
  });
});

describe("materialized", () => {
  const col = `m-${uid()}`;

  it("set / list / get / delete a materialized query", async () => {
    await wren.documents.create(col, { title: "a", category: "news" });
    const set = await wren.materialized.set(col, "slim", { query: { select: ["title"] }, refreshOn: "write" });
    expect(set.name).toBe("slim");
    expect(set.refreshOn).toBe("write");

    const { materialized } = await wren.materialized.list(col);
    expect(materialized.map((m) => m.name)).toEqual(["slim"]);

    // The first refresh runs in the background after set()
    let result = await wren.materialized.get(col, "slim").catch(() => null);
    for (let i = 0; !result && i < 50; i++) {
      await Bun.sleep(100);
      result = await wren.materialized.get(col, "slim").catch(() => null);
    }
    if (!result) throw new Error("materialized result never appeared");
    expect(result.collection).toBe(col);
    expect(result.name).toBe("slim");
    expect(result.result.data).toBeDefined();

    expect(await wren.materialized.delete(col, "slim")).toEqual({ collection: col, name: "slim", deleted: true });
    await expect(wren.materialized.get(col, "slim")).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("set without refreshOn uses the server default", async () => {
    await wren.documents.create(col, { title: "b" });
    const set = await wren.materialized.set(col, "default-refresh", { query: { select: ["title"] } });
    expect(set.name).toBe("default-refresh");
  });

  it("set with an invalid refreshOn throws WrenError(400)", async () => {
    const err = await wren.materialized.set(col, "bad", { query: {}, refreshOn: "hourly" }).catch((e) => e);
    expect(err).toBeInstanceOf(WrenError);
    expect(err.status).toBe(400);
  });
});
