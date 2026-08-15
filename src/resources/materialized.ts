import type { WrenClient } from "../client.ts";
import type { MaterializedQuery, MaterializedResult, QueryRequest } from "../types.ts";

export class MaterializedResource {
  constructor(private readonly client: WrenClient) {}

  list(collection: string): Promise<{ materialized: MaterializedQuery[] }> {
    return this.client.request<{ materialized: MaterializedQuery[] }>(
      "GET",
      `/${collection}/_materialized`,
    );
  }

  get(collection: string, name: string): Promise<MaterializedResult> {
    return this.client.request<MaterializedResult>(
      "GET",
      `/${collection}/_materialized/${encodeURIComponent(name)}`,
    );
  }

  set(
    collection: string,
    name: string,
    opts: { query: QueryRequest; refreshOn?: string },
  ): Promise<MaterializedQuery> {
    return this.client.request<MaterializedQuery>(
      "PUT",
      `/${collection}/_materialized/${encodeURIComponent(name)}`,
      opts,
    );
  }

  delete(
    collection: string,
    name: string,
  ): Promise<{ collection: string; name: string; deleted: true }> {
    return this.client.request<{ collection: string; name: string; deleted: true }>(
      "DELETE",
      `/${collection}/_materialized/${encodeURIComponent(name)}`,
    );
  }
}
