import type { WrenClient } from "../client.ts";
import type { Member } from "../types.ts";

export class MembersResource {
  constructor(private readonly client: WrenClient) {}

  list(): Promise<{ members: Member[] }> {
    return this.client.request<{ members: Member[] }>("GET", "/members");
  }

  remove(id: string): Promise<{ userId: string; removed: true }> {
    return this.client.request<{ userId: string; removed: true }>(
      "DELETE",
      `/members/${encodeURIComponent(id)}`,
    );
  }
}
