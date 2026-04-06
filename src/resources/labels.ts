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
}
