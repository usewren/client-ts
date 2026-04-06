import type { WrenClient } from "../client.ts";
import type { Invite, InviteCreated, ReceivedInvite } from "../types.ts";

export class InvitesResource {
  constructor(private readonly client: WrenClient) {}

  listSent(): Promise<{ invites: Invite[] }> {
    return this.client.request<{ invites: Invite[] }>("GET", "/api/invites");
  }

  create(email: string, role?: string): Promise<InviteCreated> {
    return this.client.request<InviteCreated>("POST", "/api/invites", {
      email,
      ...(role !== undefined ? { role } : {}),
    });
  }

  revoke(id: string): Promise<{ id: string; revoked: true }> {
    return this.client.request<{ id: string; revoked: true }>(
      "DELETE",
      `/api/invites/${encodeURIComponent(id)}`,
    );
  }

  listReceived(): Promise<{ invites: ReceivedInvite[] }> {
    return this.client.request<{ invites: ReceivedInvite[] }>("GET", "/api/invites/received");
  }

  accept(token: string): Promise<{ accepted: true; orgId: string }> {
    return this.client.request<{ accepted: true; orgId: string }>(
      "POST",
      "/api/invites/accept",
      { token },
    );
  }

  acceptById(id: string): Promise<{ accepted: true; orgId: string }> {
    return this.client.request<{ accepted: true; orgId: string }>(
      "POST",
      `/api/invites/${encodeURIComponent(id)}/accept`,
    );
  }
}
