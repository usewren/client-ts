import {
  WrenError,
  WrenForbiddenError,
  WrenNotFoundError,
  WrenUnauthorizedError,
  WrenValidationError,
} from "./errors.ts";
import type { WrenClientOptions } from "./types.ts";
import { CollectionsResource } from "./resources/collections.ts";
import { DiffResource } from "./resources/diff.ts";
import { DocumentsResource } from "./resources/documents.ts";
import { InvitesResource } from "./resources/invites.ts";
import { KeysResource } from "./resources/keys.ts";
import { LabelsResource } from "./resources/labels.ts";
import { MembersResource } from "./resources/members.ts";
import { PermissionsResource } from "./resources/permissions.ts";
import { TreesResource } from "./resources/trees.ts";
import { VersionsResource } from "./resources/versions.ts";

type QueryParams = Record<string, string | undefined>;

export class WrenClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  readonly documents: DocumentsResource;
  readonly versions: VersionsResource;
  readonly labels: LabelsResource;
  readonly diff: DiffResource;
  readonly collections: CollectionsResource;
  readonly trees: TreesResource;
  readonly keys: KeysResource;
  readonly members: MembersResource;
  readonly invites: InvitesResource;
  readonly permissions: PermissionsResource;

  constructor(opts: WrenClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (opts.apiKey) {
      this.headers["Authorization"] = `Bearer ${opts.apiKey}`;
    }

    this.documents = new DocumentsResource(this);
    this.versions = new VersionsResource(this);
    this.labels = new LabelsResource(this);
    this.diff = new DiffResource(this);
    this.collections = new CollectionsResource(this);
    this.trees = new TreesResource(this);
    this.keys = new KeysResource(this);
    this.members = new MembersResource(this);
    this.invites = new InvitesResource(this);
    this.permissions = new PermissionsResource(this);
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: QueryParams,
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const init: RequestInit = {
      method,
      headers: { ...this.headers },
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), init);

    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    if (response.ok) {
      return responseBody as T;
    }

    switch (response.status) {
      case 401:
        throw new WrenUnauthorizedError(responseBody);
      case 403:
        throw new WrenForbiddenError(responseBody);
      case 404:
        throw new WrenNotFoundError(responseBody);
      case 422: {
        const details = extractValidationDetails(responseBody);
        throw new WrenValidationError(responseBody, details);
      }
      default:
        throw new WrenError(
          response.status,
          responseBody,
          `Request failed with status ${response.status}`,
        );
    }
  }
}

function extractValidationDetails(body: unknown): string[] {
  if (body === null || typeof body !== "object") return [];
  const obj = body as Record<string, unknown>;

  if (Array.isArray(obj["errors"])) {
    return (obj["errors"] as unknown[])
      .map((e) => (typeof e === "string" ? e : JSON.stringify(e)));
  }

  if (typeof obj["message"] === "string") {
    return [obj["message"]];
  }

  if (typeof obj["error"] === "string") {
    return [obj["error"]];
  }

  return [];
}
