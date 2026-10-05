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

const page = await wren.documents.list("articles", { where: "title:Hello", limit: 20, offset: 0 });
const pinned = await wren.documents.get("articles", doc.id, { label: "published" });

// Retention (org owner/admin): keep the newest 20 versions everywhere, but everything in "contracts".
// A document's current version and every labeled version are always kept.
const { total } = await wren.retention.preview("*", { maxVersions: 20 }); // { versions, documents, bytes }; changes nothing
await wren.retention.set("*", { maxVersions: 20 });
await wren.retention.set("contracts", {}); // no rule = keep everything
await wren.retention.apply();              // or wait for the hourly run
```

- Node >= 18, Bun, Browser
- Zero runtime dependencies
- Full TypeScript types
- Resources: documents, versions, labels, diff, collections, trees, query, materialized, keys, members, invites, permissions, webhooks, retention

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
