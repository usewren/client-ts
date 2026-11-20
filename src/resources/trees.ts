import type { WrenClient } from "../client.ts";
import type {
  FullTree,
  TreeInfo,
  TreeNodeResult,
  TreePromoteOptions,
  TreePromoteResult,
  TreeRestoreResult,
} from "../types.ts";

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

  /**
   * Atomically point `label` (default "published") at, for every document in
   * the tree, the version carrying `from` — or the current version when `from`
   * is omitted. One transaction: readers never see a half-promoted tree.
   * Throws WrenNotFoundError if the tree is empty (or nothing carries `from`)
   * and WrenForbiddenError if a collection isn't writable (nothing changes).
   */
  promote(name: string, opts?: TreePromoteOptions): Promise<TreePromoteResult> {
    return this.client.request<TreePromoteResult>(
      "POST",
      `/tree/${encodeURIComponent(name)}/_promote`,
      { label: opts?.label, from: opts?.from },
    );
  }

  /**
   * Put every document mounted in the tree back to the version carrying `label`
   * (files included), in one transaction. Needs write access to every collection in
   * the tree (WrenForbiddenError otherwise; nothing changes).
   */
  restore(name: string, opts: { label: string }): Promise<TreeRestoreResult> {
    return this.client.request<TreeRestoreResult>(
      "POST",
      `/tree/${encodeURIComponent(name)}/_restore`,
      { label: opts.label },
    );
  }
}
