import { ifMatch, type WrenClient } from "../client.ts";
import type { DocumentResponse, FileDownloadOptions, FileUploadOptions } from "../types.ts";

/**
 * Files addressed by name, in a file collection whose schema has
 * `{ collectionType: "binary", naturalKey: "filename" }` — e.g.
 * `collections.patchSchema(col, { collectionType: "binary", naturalKey: "filename" })`.
 */
export class FilesResource {
  constructor(private readonly client: WrenClient) {}

  /**
   * Upload a file under `name`: creates it, or adds a version when the bytes differ.
   * Identical bytes create no version (the response carries `unchanged: true`).
   * The stored file is named `name`, and its MIME type follows from the name.
   */
  uploadByName(
    collection: string,
    name: string,
    content: Blob | ArrayBuffer | Uint8Array | string,
    opts?: FileUploadOptions,
  ): Promise<DocumentResponse> {
    const type = opts?.contentType ?? (content instanceof Blob ? content.type : "");
    const form = new FormData();
    form.append("file", new File([content as BlobPart], name, { type }));
    return this.client.request<DocumentResponse>(
      "PUT",
      `/${collection}/by-key/${encodeURIComponent(name)}`,
      form,
      undefined,
      ifMatch(opts?.ifVersion),
    );
  }

  /** Download a file's bytes by name: the current version, or a `version` or `label`. */
  downloadByName(collection: string, name: string, opts?: FileDownloadOptions): Promise<ArrayBuffer> {
    return this.client.requestBytes(`/${collection}/by-key/${encodeURIComponent(name)}/raw`, {
      version: opts?.version !== undefined ? String(opts.version) : undefined,
      label: opts?.label,
    });
  }
}
