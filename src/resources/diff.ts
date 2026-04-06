import type { WrenClient } from "../client.ts";
import type { DiffResult } from "../types.ts";

export class DiffResource {
  constructor(private readonly client: WrenClient) {}

  compare(collection: string, id: string, v1: number, v2: number): Promise<DiffResult> {
    return this.client.request<DiffResult>(
      "GET",
      `/${collection}/${encodeURIComponent(id)}/diff`,
      undefined,
      { v1: String(v1), v2: String(v2) },
    );
  }
}
