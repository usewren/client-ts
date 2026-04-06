import type { WrenClient } from "../client.ts";
import type { FullTree, TreeInfo, TreeNodeResult } from "../types.ts";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export class TreesResource {
  constructor(private readonly client: WrenClient) {}

  list(): Promise<{ trees: TreeInfo[] }> {
    return this.client.request<{ trees: TreeInfo[] }>("GET", "/tree");
  }

  snapshot(name: string): Promise<FullTree> {
    return this.client.request<FullTree>("GET", `/tree/${encodeURIComponent(name)}`, undefined, {
      full: "true",
    });
  }

  getNode(name: string, path: string): Promise<TreeNodeResult> {
    const normalizedPath = normalizePath(path);
    return this.client.request<TreeNodeResult>(
      "GET",
      `/tree/${encodeURIComponent(name)}${normalizedPath}`,
    );
  }

  assign(
    name: string,
    path: string,
    documentId: string,
  ): Promise<{ path: string; documentId: string }> {
    const normalizedPath = normalizePath(path);
    return this.client.request<{ path: string; documentId: string }>(
      "PUT",
      `/tree/${encodeURIComponent(name)}${normalizedPath}`,
      { documentId },
    );
  }

  unassign(name: string, path: string): Promise<{ path: string; removed: true }> {
    const normalizedPath = normalizePath(path);
    return this.client.request<{ path: string; removed: true }>(
      "DELETE",
      `/tree/${encodeURIComponent(name)}${normalizedPath}`,
    );
  }
}
