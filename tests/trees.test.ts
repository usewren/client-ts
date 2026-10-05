import { beforeAll, describe, expect, it } from "bun:test";
import { WrenNotFoundError, type WrenClient } from "../src/index.ts";
import { createUser, uid } from "./helpers.ts";

let wren: WrenClient;
const col = `pages-${uid()}`;

beforeAll(async () => {
  ({ client: wren } = await createUser("trees"));
});

describe("trees", () => {
  it("assign puts a document at a path; getNode reads it back", async () => {
    const tree = `site-${uid()}`;
    const doc = await wren.documents.create(col, { title: "Hello" });
    const res = await wren.trees.assign(tree, "/blog/hello", doc.id);
    expect(res).toMatchObject({ path: "/blog/hello", documentId: doc.id });

    const node = await wren.trees.getNode(tree, "/blog/hello");
    expect(node.path).toBe("/blog/hello");
    expect(node.document?.id).toBe(doc.id);
    expect(node.document?.data.title).toBe("Hello");
  });

  it("paths without a leading slash are normalized", async () => {
    const tree = `site-${uid()}`;
    const doc = await wren.documents.create(col, { title: "No slash" });
    await wren.trees.assign(tree, "docs/intro", doc.id);
    const node = await wren.trees.getNode(tree, "docs/intro");
    expect(node.path).toBe("/docs/intro");
    expect(node.document?.id).toBe(doc.id);
  });

  it("getNode lists children of a folder", async () => {
    const tree = `site-${uid()}`;
    const a = await wren.documents.create(col, { title: "A" });
    const b = await wren.documents.create(col, { title: "B" });
    await wren.trees.assign(tree, "/blog/a", a.id);
    await wren.trees.assign(tree, "/blog/b", b.id);
    const folder = await wren.trees.getNode(tree, "/blog");
    expect(folder.children.map((c) => c.path).sort()).toEqual(["/blog/a", "/blog/b"]);
  });

  it("snapshot returns every node with its document", async () => {
    const tree = `site-${uid()}`;
    const a = await wren.documents.create(col, { title: "A" });
    const b = await wren.documents.create(col, { title: "B" });
    await wren.trees.assign(tree, "/index.html", a.id);
    await wren.trees.assign(tree, "/about.html", b.id);
    const snap = await wren.trees.snapshot(tree);
    expect(snap.tree).toBe(tree);
    const byPath = Object.fromEntries(snap.nodes.map((n) => [n.path, n]));
    expect(byPath["/index.html"]!.documentId).toBe(a.id);
    expect(byPath["/about.html"]!.document.data.title).toBe("B");
  });

  it("list returns trees with path counts", async () => {
    const tree = `site-${uid()}`;
    const doc = await wren.documents.create(col, { title: "x" });
    await wren.trees.assign(tree, "/x", doc.id);
    const { trees } = await wren.trees.list();
    expect(trees.find((t) => t.name === tree)?.count).toBeGreaterThanOrEqual(1);
  });

  it("unassign removes the path", async () => {
    const tree = `site-${uid()}`;
    const doc = await wren.documents.create(col, { title: "x" });
    await wren.trees.assign(tree, "/keep", doc.id);
    await wren.trees.assign(tree, "/gone", doc.id);
    const res = await wren.trees.unassign(tree, "gone");
    expect(res).toMatchObject({ path: "/gone", removed: true });
    await expect(wren.trees.getNode(tree, "/gone")).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("getNode of a missing path throws WrenNotFoundError", async () => {
    await expect(wren.trees.getNode(`nope-${uid()}`, "/missing")).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("unassign of a missing path throws WrenNotFoundError", async () => {
    await expect(wren.trees.unassign(`nope-${uid()}`, "/missing")).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("promote labels every document's current version as published by default", async () => {
    const tree = `site-${uid()}`;
    const a = await wren.documents.create(col, { title: "A1" });
    const b = await wren.documents.create(col, { title: "B1" });
    await wren.documents.update(col, a.id, { title: "A2" });
    await wren.trees.assign(tree, "/index.html", a.id);
    await wren.trees.assign(tree, "/about.html", b.id);

    const res = await wren.trees.promote(tree);
    expect(res.tree).toBe(tree);
    expect(res.label).toBe("published");
    expect(res.from).toBeNull();
    const byPath = Object.fromEntries(res.promoted.map((p) => [p.path, p]));
    expect(byPath["/index.html"]).toEqual({ path: "/index.html", documentId: a.id, collection: col, version: 2 });
    expect(byPath["/about.html"]).toEqual({ path: "/about.html", documentId: b.id, collection: col, version: 1 });

    const pub = await wren.documents.get(col, a.id, { label: "published" });
    expect(pub.data.title).toBe("A2");
  });

  it("promote from a label moves only documents carrying it, under a custom label", async () => {
    const tree = `site-${uid()}`;
    const a = await wren.documents.create(col, { title: "A1" });
    const b = await wren.documents.create(col, { title: "B1" });
    await wren.labels.set(col, a.id, "preview");
    await wren.documents.update(col, a.id, { title: "A2 draft" });
    await wren.trees.assign(tree, "/a", a.id);
    await wren.trees.assign(tree, "/b", b.id);

    const res = await wren.trees.promote(tree, { label: "live", from: "preview" });
    expect(res).toEqual({
      tree,
      label: "live",
      from: "preview",
      promoted: [{ path: "/a", documentId: a.id, collection: col, version: 1 }],
    });
    expect((await wren.documents.get(col, a.id, { label: "live" })).data.title).toBe("A1");
    await expect(wren.documents.get(col, b.id, { label: "live" })).rejects.toBeInstanceOf(WrenNotFoundError);
  });

  it("promote of an empty tree throws WrenNotFoundError", async () => {
    await expect(wren.trees.promote(`nope-${uid()}`)).rejects.toBeInstanceOf(WrenNotFoundError);
  });
});
