import type { WrenClient } from "../client.ts";
import type { Webhook, WebhookCreated, WebhookDelivery } from "../types.ts";

export class WebhooksResource {
  constructor(private readonly client: WrenClient) {}

  list(): Promise<{ webhooks: Webhook[] }> {
    return this.client.request<{ webhooks: Webhook[] }>("GET", "/webhooks");
  }

  create(
    url: string,
    opts?: { events?: string[] },
  ): Promise<WebhookCreated> {
    return this.client.request<WebhookCreated>("POST", "/webhooks", {
      url,
      events: opts?.events,
    });
  }

  update(
    id: string,
    opts: { url?: string; events?: string[]; enabled?: boolean },
  ): Promise<Webhook> {
    return this.client.request<Webhook>(
      "PUT",
      `/webhooks/${encodeURIComponent(id)}`,
      opts,
    );
  }

  delete(id: string): Promise<{ id: string; deleted: true }> {
    return this.client.request<{ id: string; deleted: true }>(
      "DELETE",
      `/webhooks/${encodeURIComponent(id)}`,
    );
  }

  deliveries(id: string): Promise<{ deliveries: WebhookDelivery[] }> {
    return this.client.request<{ deliveries: WebhookDelivery[] }>(
      "GET",
      `/webhooks/${encodeURIComponent(id)}/deliveries`,
    );
  }

  replay(
    id: string,
    opts: { since: string; until?: string },
  ): Promise<{ replayed: number }> {
    return this.client.request<{ replayed: number }>(
      "POST",
      `/webhooks/${encodeURIComponent(id)}/replay`,
      opts,
    );
  }
}
