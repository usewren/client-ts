import type { WrenClient } from "../client.ts";
import type { DiffOptions, DiffResult } from "../types.ts";

export class DiffResource {
  constructor(private readonly client: WrenClient) {}

  /**
   * Compare two versions of a document. `v1`/`v2` are version numbers or label names
   * (the server resolves labels; the result carries the numbers). With `deep`, nested
   * changes are reported path by path.
   */
  compare(
    collection: string,
    id: string,
    v1: number | string,
    v2: number | string,
    opts?: DiffOptions,
  ): Promise<DiffResult> {
    return this.client.request<DiffResult>(
      "GET",
      `/${collection}/${encodeURIComponent(id)}/diff`,
      undefined,
      { v1: String(v1), v2: String(v2), deep: opts?.deep ? "true" : undefined },
    );
  }
}
