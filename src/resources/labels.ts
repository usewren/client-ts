import type { WrenClient } from "../client.ts";

export class LabelsResource {
  constructor(private readonly client: WrenClient) {}

  set(
    collection: string,
    id: string,
    label: string,
    version?: number,
  ): Promise<{ id: string; label: string; version: number }> {
    return this.client.request<{ id: string; label: string; version: number }>(
      "POST",
      `/${collection}/${encodeURIComponent(id)}/labels`,
      { label, ...(version !== undefined ? { version } : {}) },
    );
  }

  /** Remove a label from a document. Throws WrenNotFoundError if it doesn't carry it. */
  remove(
    collection: string,
    id: string,
    label: string,
  ): Promise<{ id: string; label: string; removed: true; version: number }> {
    return this.client.request<{ id: string; label: string; removed: true; version: number }>(
      "DELETE",
      `/${collection}/${encodeURIComponent(id)}/labels/${encodeURIComponent(label)}`,
    );
  }
}
