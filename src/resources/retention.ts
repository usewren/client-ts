import type { WrenClient } from "../client.ts";
import type { RetentionOverview, RetentionPolicy, RetentionResult, RetentionRules } from "../types.ts";

// Version retention policies (org owner or admin). The target is a collection
// name, or "*" for the org default. A document's current version and every
// labeled version are always kept.
export class RetentionResource {
  constructor(private readonly client: WrenClient) {}

  /** The org default, each collection's own policy and the last 20 runs that removed versions. */
  get(): Promise<RetentionOverview> {
    return this.client.request<RetentionOverview>("GET", "/retention");
  }

  /**
   * Replace the policy of a collection (or "*"). Rules left out are off; a
   * policy with no rule keeps everything, which exempts a collection from the
   * org default.
   */
  set(collection: string, rules: RetentionRules): Promise<RetentionPolicy> {
    return this.client.request<RetentionPolicy>("PUT", path(collection), rules);
  }

  /** Remove a policy: the collection falls back to the org default. */
  remove(collection: string): Promise<{ collection: string; deleted: true }> {
    return this.client.request<{ collection: string; deleted: true }>("DELETE", path(collection));
  }

  /**
   * What the saved policy, or `rules` when given, would remove. Changes
   * nothing. For "*", covers the collections without a policy of their own.
   */
  preview(collection: string, rules?: RetentionRules): Promise<RetentionResult> {
    return this.client.request<RetentionResult>("POST", `${path(collection)}/_preview`, rules);
  }

  /** Apply all of the org's policies now (they also run hourly). */
  apply(): Promise<RetentionResult> {
    return this.client.request<RetentionResult>("POST", "/retention/_apply");
  }
}

const path = (collection: string) => `/retention/${encodeURIComponent(collection)}`;
