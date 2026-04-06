import type { WrenClient } from "../client.ts";
import type { CreatePermissionOptions, Permission, UpdatePermissionOptions } from "../types.ts";

export class PermissionsResource {
  constructor(private readonly client: WrenClient) {}

  list(): Promise<{ permissions: Permission[] }> {
    return this.client.request<{ permissions: Permission[] }>("GET", "/permissions");
  }

  create(opts: CreatePermissionOptions): Promise<Permission> {
    return this.client.request<Permission>("POST", "/permissions", opts);
  }

  update(id: string, patch: UpdatePermissionOptions): Promise<Permission> {
    return this.client.request<Permission>(
      "PUT",
      `/permissions/${encodeURIComponent(id)}`,
      patch,
    );
  }

  delete(id: string): Promise<{ id: string; deleted: true }> {
    return this.client.request<{ id: string; deleted: true }>(
      "DELETE",
      `/permissions/${encodeURIComponent(id)}`,
    );
  }
}
