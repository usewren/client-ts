# WREN TypeScript Client

Official TypeScript/JavaScript client for the [WREN](https://wren.aemwip.com) API.

```bash
npm install @usewren/client
```

```typescript
import { WrenClient } from "@usewren/client";

const wren = new WrenClient({ baseUrl: "https://wren.aemwip.com", apiKey: "wren_..." });
const doc = await wren.documents.create("articles", { title: "Hello" });
await wren.labels.set("articles", doc.id, "published");
await wren.trees.assign("site", "/blog/hello", doc.id);

// Promote a whole tree atomically: point "published" at every document's "preview"
// version in one transaction (omit `from` to promote current versions).
const { promoted } = await wren.trees.promote("site", { label: "published", from: "preview" });

const page = await wren.documents.list("articles", { where: "title:Hello", limit: 20, offset: 0 });
const pinned = await wren.documents.get("articles", doc.id, { label: "published" });

// Retention (org owner/admin): keep the newest 20 versions everywhere, but everything in "contracts".
// A document's current version and every labeled version are always kept.
const { total } = await wren.retention.preview("*", { maxVersions: 20 }); // { versions, documents, bytes }; changes nothing
await wren.retention.set("*", { maxVersions: 20 });
await wren.retention.set("contracts", {}); // no rule = keep everything
await wren.retention.apply();              // or wait for the hourly run
```

### Versions: conditional and unchanged writes, undelete, restore, diff

```typescript
import { WrenVersionMismatchError } from "@usewren/client";

// Conditional writes: only apply if nobody wrote the document since you read it
const current = await wren.documents.get("articles", doc.id);
try {
  await wren.documents.update("articles", doc.id, { title: "Edited" }, { ifVersion: current.version });
} catch (e) {
  if (e instanceof WrenVersionMismatchError) console.log("re-read: now at", e.currentVersion);
  else throw e;
}
await wren.documents.upsertByKey("products", "sku-1", { sku: "sku-1" }, { ifVersion: 0 });   // create only
await wren.documents.upsertByKey("products", "sku-1", { sku: "sku-1" }, { ifVersion: "*" }); // update only
await wren.documents.delete("articles", doc.id, { ifVersion: 3 });

// A write with the same data creates no version: the response carries `unchanged: true`
const res = await wren.documents.update("articles", doc.id, current.data);
if (res.unchanged) console.log("still at", res.version);
await wren.documents.update("articles", doc.id, current.data, { force: true }); // write a version anyway

await wren.documents.undelete("articles", doc.id);
await wren.labels.remove("articles", doc.id, "draft");

// Restore a collection or a tree to a label in one transaction
await wren.documents.restore("articles", { label: "fixture", deleteUnlabeled: true });
await wren.trees.restore("site", { label: "release-1" }); // { tree, label, restored, undeleted, deleted, unchanged, collections }

// Diffs take labels as well as version numbers; deep reports nested paths
const { diff } = await wren.diff.compare("articles", doc.id, "published", 5, { deep: true });

// Change only some schema fields (null clears one)
await wren.collections.patchSchema("products", { naturalKey: "sku", displayName: null });
```

### Files by name

In a file collection with `naturalKey: "filename"`, files are addressed by their name:

```typescript
await wren.collections.patchSchema("assets", { collectionType: "binary", naturalKey: "filename" });
await wren.files.uploadByName("assets", "logo.svg", new Blob([svg], { type: "image/svg+xml" })); // or bytes / a string
// Same bytes again: no new version, `unchanged: true`. ifVersion works here too.
const bytes = await wren.files.downloadByName("assets", "logo.svg");              // ArrayBuffer
const old = await wren.files.downloadByName("assets", "logo.svg", { label: "published" }); // or { version: 2 }
```

- Node >= 18, Bun, Browser
- Zero runtime dependencies
- Full TypeScript types
- Resources: documents, files, versions, labels, diff, collections, trees, query, materialized, keys, members, invites, permissions, webhooks, retention
- Errors: `WrenError` and its subclasses `WrenNotFoundError` (404), `WrenUnauthorizedError` (401), `WrenForbiddenError` (403), `WrenVersionMismatchError` (412, with `currentVersion`), `WrenValidationError` (422, with `details`)

## Running the tests

The tests in `tests/` are integration tests: they run against a real WREN server and
sign up their own throwaway users. With Docker and the WREN sources checked out next to
this repo (`../sandbox`, `../db`, `../auth` …), one command builds the server image,
starts Postgres and the server on a private network, runs `bun test --coverage` and
cleans up:

```bash
sh tests/run-local.sh                    # all tests
sh tests/run-local.sh tests/trees.test.ts
```

Against a server you already run: `WREN_URL=http://localhost:4000 bun test --coverage`.
Use a disposable server only — the tests create users, keys, invites and webhooks.

## Links

- **Website:** https://wren.aemwip.com
- **All repos:** [github.com/usewren](https://github.com/usewren)
- **Tutorial:** https://wren.aemwip.com/tutorial
- **API Docs:** https://wren.aemwip.com/docs

## License

Apache-2.0
