import type { WrenClient } from "../client.ts";
import type {
  DocumentList,
  DocumentPaths,
  DocumentResponse,
  ListDocumentsOptions,
} from "../types.ts";

export class DocumentsResource {
  constructor(private readonly client: WrenClient) {}

  list(collection: string, opts?: ListDocumentsOptions): Promise<DocumentList> {
    return this.client.request<DocumentList>("GET", `/${collection}`, undefined, {
      label: opts?.label,
      filter: opts?.filter,
      limit: opts?.limit !== undefined ? String(opts.limit) : undefined,
      cursor: opts?.cursor,
      facets: opts?.facets,
    });
  }

  create(collection: string, data: Record<string, unknown>): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>("POST", `/${collection}`, data);
  }

  get(collection: string, id: string, opts?: { label?: string }): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>(
      "GET",
      `/${collection}/${encodeURIComponent(id)}`,
      undefined,
      { label: opts?.label },
    );
  }

  update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>(
      "PUT",
      `/${collection}/${encodeURIComponent(id)}`,
      data,
    );
  }

  delete(collection: string, id: string): Promise<{ id: string; deleted: true }> {
    return this.client.request<{ id: string; deleted: true }>(
      "DELETE",
      `/${collection}/${encodeURIComponent(id)}`,
    );
  }

  getPaths(collection: string, id: string): Promise<DocumentPaths> {
    return this.client.request<DocumentPaths>(
      "GET",
      `/${collection}/${encodeURIComponent(id)}/paths`,
    );
  }
}
