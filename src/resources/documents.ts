import { ifMatch, type WrenClient } from "../client.ts";
import type {
  DeleteOptions,
  DocumentGetOptions,
  DocumentList,
  DocumentPaths,
  DocumentResponse,
  ListDocumentsOptions,
  RestoreOptions,
  RestoreResult,
  WriteOptions,
} from "../types.ts";

const force = (opts?: WriteOptions) => (opts?.force ? { force: "true" } : undefined);

export class DocumentsResource {
  constructor(private readonly client: WrenClient) {}

  list(collection: string, opts?: ListDocumentsOptions): Promise<DocumentList> {
    return this.client.request<DocumentList>("GET", `/${collection}`, undefined, {
      label: opts?.label,
      select: opts?.select,
      where: opts?.where,
      limit: opts?.limit !== undefined ? String(opts.limit) : undefined,
      offset: opts?.offset !== undefined ? String(opts.offset) : undefined,
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

  /**
   * Write a new version. Data equal to the current version's creates none (the
   * response carries `unchanged: true`) unless `force` is set. With `ifVersion`, the
   * write only applies if the document is still at that version.
   */
  update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    opts?: WriteOptions,
  ): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>(
      "PUT",
      `/${collection}/${encodeURIComponent(id)}`,
      data,
      force(opts),
      ifMatch(opts?.ifVersion),
    );
  }

  delete(collection: string, id: string, opts?: DeleteOptions): Promise<{ id: string; deleted: true }> {
    return this.client.request<{ id: string; deleted: true }>(
      "DELETE",
      `/${collection}/${encodeURIComponent(id)}`,
      undefined,
      undefined,
      ifMatch(opts?.ifVersion),
    );
  }

  /** Bring back a deleted document, with its history, at the version it had. */
  undelete(collection: string, id: string): Promise<{ id: string; undeleted: true; version: number }> {
    return this.client.request<{ id: string; undeleted: true; version: number }>(
      "POST",
      `/${collection}/${encodeURIComponent(id)}/undelete`,
    );
  }

  /**
   * Put a whole collection back to a label in one transaction: documents carrying the
   * label get the labeled content (deleted ones come back); with `deleteUnlabeled`,
   * documents without it are deleted. Throws WrenNotFoundError if no document has it.
   */
  restore(collection: string, opts: RestoreOptions): Promise<RestoreResult> {
    return this.client.request<RestoreResult>("POST", `/${collection}/_restore`, {
      label: opts.label,
      deleteUnlabeled: opts.deleteUnlabeled,
    });
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
      `/${collection}/by-key/${encodeURIComponent(keyValue)}`,
      undefined,
      {
        label: opts?.label,
        depth: opts?.depth !== undefined ? String(opts.depth) : undefined,
      },
    );
  }

  /**
   * Create or update the document with this natural-key value. `ifVersion: 0` only
   * creates (an existing document is left alone); `ifVersion: "*"` only updates.
   */
  upsertByKey(
    collection: string,
    keyValue: string,
    data: Record<string, unknown>,
    opts?: WriteOptions,
  ): Promise<DocumentResponse> {
    return this.client.request<DocumentResponse>(
      "PUT",
      `/${collection}/by-key/${encodeURIComponent(keyValue)}`,
      data,
      force(opts),
      ifMatch(opts?.ifVersion),
    );
  }

  deleteByKey(collection: string, keyValue: string, opts?: DeleteOptions): Promise<{ id: string; deleted: true }> {
    return this.client.request<{ id: string; deleted: true }>(
      "DELETE",
      `/${collection}/by-key/${encodeURIComponent(keyValue)}`,
      undefined,
      undefined,
      ifMatch(opts?.ifVersion),
    );
  }
}
