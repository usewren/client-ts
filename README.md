# WREN TypeScript Client

Official TypeScript/JavaScript client for the [WREN](https://wren.aemwip.com) API.

```bash
npm install @wren/client
```

```typescript
import { WrenClient } from "@wren/client";

const wren = new WrenClient({ baseUrl: "https://wren.aemwip.com", apiKey: "wren_..." });
const doc = await wren.documents.create("articles", { title: "Hello" });
await wren.labels.set("articles", doc.id, "published");
await wren.trees.set("site", "/blog/hello", doc.id);
```

- Node >= 18, Bun, Browser
- Zero runtime dependencies
- Full TypeScript types
- Resources: documents, versions, labels, diff, collections, trees, keys, members, invites, permissions

## Links

- **Website:** https://wren.aemwip.com
- **All repos:** [github.com/usewren](https://github.com/usewren)
- **Tutorial:** https://wren.aemwip.com/tutorial
- **API Docs:** https://wren.aemwip.com/docs

## License

Apache-2.0
