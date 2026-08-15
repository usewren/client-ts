import type { WrenClient } from "../client.ts";
import type { QueryRequest, QueryResult } from "../types.ts";

export class QueryResource {
  constructor(private readonly client: WrenClient) {}

  run(collection: string, query: QueryRequest): Promise<QueryResult> {
    return this.client.request<QueryResult>("POST", `/${collection}/_query`, query);
  }
}
