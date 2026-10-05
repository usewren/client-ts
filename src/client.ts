import {
  WrenError,
  WrenForbiddenError,
  WrenNotFoundError,
  WrenUnauthorizedError,
  WrenValidationError,
  WrenVersionMismatchError,
} from "./errors.ts";
import type { WrenClientOptions } from "./types.ts";
import { CollectionsResource } from "./resources/collections.ts";
import { DiffResource } from "./resources/diff.ts";
import { DocumentsResource } from "./resources/documents.ts";
import { FilesResource } from "./resources/files.ts";
import { InvitesResource } from "./resources/invites.ts";
import { KeysResource } from "./resources/keys.ts";
import { LabelsResource } from "./resources/labels.ts";
import { MaterializedResource } from "./resources/materialized.ts";
import { MembersResource } from "./resources/members.ts";
import { PermissionsResource } from "./resources/permissions.ts";
import { QueryResource } from "./resources/query.ts";
import { RetentionResource } from "./resources/retention.ts";
import { TreesResource } from "./resources/trees.ts";
import { VersionsResource } from "./resources/versions.ts";
import { WebhooksResource } from "./resources/webhooks.ts";

type QueryParams = Record<string, string | undefined>;

/** Extra request options: headers to add to the request. */
export interface RequestOptions {
  headers?: Record<string, string>;
}

export class WrenClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  readonly documents: DocumentsResource;
  readonly files: FilesResource;
  readonly versions: VersionsResource;
  readonly labels: LabelsResource;
  readonly diff: DiffResource;
  readonly collections: CollectionsResource;
  readonly trees: TreesResource;
  readonly keys: KeysResource;
  readonly members: MembersResource;
  readonly invites: InvitesResource;
  readonly permissions: PermissionsResource;
  readonly query: QueryResource;
  readonly materialized: MaterializedResource;
  readonly webhooks: WebhooksResource;
  readonly retention: RetentionResource;

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
    this.files = new FilesResource(this);
    this.versions = new VersionsResource(this);
    this.labels = new LabelsResource(this);
    this.diff = new DiffResource(this);
    this.collections = new CollectionsResource(this);
    this.trees = new TreesResource(this);
    this.keys = new KeysResource(this);
    this.members = new MembersResource(this);
    this.invites = new InvitesResource(this);
    this.permissions = new PermissionsResource(this);
    this.query = new QueryResource(this);
    this.materialized = new MaterializedResource(this);
    this.webhooks = new WebhooksResource(this);
    this.retention = new RetentionResource(this);
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: QueryParams,
    opts?: RequestOptions,
  ): Promise<T> {
    const response = await this.send(method, path, body, query, opts);
    const contentType = response.headers.get("content-type") ?? "";
    return (contentType.includes("application/json")
      ? await response.json()
      : await response.text()) as T;
  }

  /** Like request(), but returns the response body as bytes (file downloads). */
  async requestBytes(path: string, query?: QueryParams): Promise<ArrayBuffer> {
    const response = await this.send("GET", path, undefined, query, { headers: { Accept: "*/*" } });
    return response.arrayBuffer();
  }

  private async send(
    method: string,
    path: string,
    body: unknown,
    query: QueryParams | undefined,
    opts: RequestOptions | undefined,
  ): Promise<Response> {
    const url = new URL(this.baseUrl + "/api/v1" + path);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = { ...this.headers, ...opts?.headers };
    const init: RequestInit = { method, headers };

    if (body instanceof FormData) {
      // fetch sets the multipart Content-Type (with its boundary) itself
      delete headers["Content-Type"];
      init.body = body;
    } else if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), init);
    if (response.ok) return response;

    const contentType = response.headers.get("content-type") ?? "";
    const responseBody: unknown = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    switch (response.status) {
      case 401:
        throw new WrenUnauthorizedError(responseBody);
      case 403:
        throw new WrenForbiddenError(responseBody);
      case 404:
        throw new WrenNotFoundError(responseBody);
      case 412:
        throw new WrenVersionMismatchError(responseBody);
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

/**
 * The If-Match header for a conditional write: a version number ("only if the
 * document is still at this version"; 0 = only if it doesn't exist yet) or "*"
 * ("only if it exists").
 */
export function ifMatch(ifVersion: number | "*" | undefined): RequestOptions | undefined {
  if (ifVersion === undefined) return undefined;
  return { headers: { "If-Match": ifVersion === "*" ? "*" : `"${ifVersion}"` } };
}

function extractValidationDetails(body: unknown): string[] {
  if (body === null || typeof body !== "object") return [];
  const obj = body as Record<string, unknown>;

  // The server sends { error, details: [...] } for schema violations and
  // { error, details: "..." } for an invalid schema; prefer those over `error`.
  const list = obj["details"] ?? obj["errors"];
  if (Array.isArray(list)) {
    return (list as unknown[])
      .map((e) => (typeof e === "string" ? e : JSON.stringify(e)));
  }

  if (typeof list === "string") {
    return [list];
  }

  if (typeof obj["message"] === "string") {
    return [obj["message"]];
  }

  if (typeof obj["error"] === "string") {
    return [obj["error"]];
  }

  return [];
}
