import type { WrenClient } from "../client.ts";
import type { ApiKey, ApiKeyCreated } from "../types.ts";

export class KeysResource {
  constructor(private readonly client: WrenClient) {}

  list(): Promise<{ keys: ApiKey[] }> {
    return this.client.request<{ keys: ApiKey[] }>("GET", "/keys");
  }

  create(name: string): Promise<ApiKeyCreated> {
    return this.client.request<ApiKeyCreated>("POST", "/keys", { name });
  }

  revoke(id: string): Promise<{ id: string; revoked: true }> {
    return this.client.request<{ id: string; revoked: true }>(
      "DELETE",
      `/keys/${encodeURIComponent(id)}`,
    );
  }
}
