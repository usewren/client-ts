import type { WrenClient } from "../client.ts";
import type { DocumentResponse, VersionList } from "../types.ts";

export class VersionsResource {
  constructor(private readonly client: WrenClient) {}

  list(collection: string, id: string): Promise<VersionList> {
    return this.client.request<VersionList>(
      "GET",
      `/${collection}/${encodeURIComponent(id)}/versions`,
    );
  }

  get(collection: string, id: string, version: number): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>(
      "GET",
      `/${collection}/${encodeURIComponent(id)}/versions/${version}`,
    );
  }

  rollback(
    collection: string,
    id: string,
    version: number,
  ): Promise<{ id: string; version: number; rolledBackTo: number }> {
    return this.client.request<{ id: string; version: number; rolledBackTo: number }>(
      "POST",
      `/${collection}/${encodeURIComponent(id)}/rollback/${version}`,
    );
  }
}
