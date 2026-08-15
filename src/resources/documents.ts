import type { WrenClient } from "../client.ts";
import type {
  DocumentGetOptions,
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
      select: opts?.select,
      where: opts?.where,
      limit: opts?.limit !== undefined ? String(opts.limit) : undefined,
      cursor: opts?.cursor,
      facets: opts?.facets,
      depth: opts?.depth !== undefined ? String(opts.depth) : undefined,
    });
  }

  create(collection: string, data: Record<string, unknown>): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>("POST", `/${collection}`, data);
  }

  get(collection: string, id: string, opts?: DocumentGetOptions): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>(
      "GET",
      `/${collection}/${encodeURIComponent(id)}`,
      undefined,
      {
        label: opts?.label,
        depth: opts?.depth !== undefined ? String(opts.depth) : undefined,
      },
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

  getByKey(
    collection: string,
    keyValue: string,
    opts?: DocumentGetOptions,
  ): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>(
      "GET",
      `/${collection}/key/${encodeURIComponent(keyValue)}`,
      undefined,
      {
        label: opts?.label,
        depth: opts?.depth !== undefined ? String(opts.depth) : undefined,
      },
    );
  }

  upsertByKey(
    collection: string,
    keyValue: string,
    data: Record<string, unknown>,
  ): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>(
      "PUT",
      `/${collection}/key/${encodeURIComponent(keyValue)}`,
      data,
    );
  }

  deleteByKey(collection: string, keyValue: string): Promise<{ id: string; deleted: true }> {
    return this.client.request<{ id: string; deleted: true }>(
      "DELETE",
      `/${collection}/key/${encodeURIComponent(keyValue)}`,
    );
  }
}
