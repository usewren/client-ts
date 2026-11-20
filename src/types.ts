export interface WrenClientOptions {
  baseUrl: string;
  apiKey?: string;
}

export interface DocumentResponse {
  collection: string;
  id: string;
  version: number;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
  /**
   * Set on a write that changed nothing (the data equals the current version's, or a
   * file has the same bytes): no version was created and `version` is the current one.
   */
  unchanged?: true;
  /** The document's natural-key value, on writes to a collection that has one. */
  naturalKey?: string;
}

export interface WriteOptions {
  /**
   * Write only if the document is still at this version (sent as `If-Match`); else
   * the write is refused with a WrenVersionMismatchError carrying `currentVersion`.
   * For an upsert by key, `0` means "only create" and `"*"` means "only update".
   */
  ifVersion?: number | "*";
  /** Create a version even when the data is unchanged. */
  force?: boolean;
}

export interface DeleteOptions {
  /** Delete only if the document is still at this version. */
  ifVersion?: number | "*";
}

export interface DocumentList {
  collection: string;
  total: number;
  items: DocumentResponse[];
}

export interface DocumentPaths {
  id: string;
  collection: string;
  paths: Array<{ tree: string; path: string }>;
}

export interface VersionMeta {
  version: number;
  labels: string[];
  createdAt: string;
  createdBy: string;
}

export interface VersionList {
  collection: string;
  id: string;
  versions: VersionMeta[];
}

export interface DiffEntry {
  op: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

export interface DiffOptions {
  /** Report nested changes path by path (e.g. `/a/b`) instead of whole top-level fields. */
  deep?: boolean;
}

export interface DiffResult {
  id: string;
  collection: string;
  v1: number;
  v2: number;
  diff: DiffEntry[];
}

export interface RestoreOptions {
  /** Put every document carrying this label back to the labeled version. */
  label: string;
  /** Also delete documents that don't carry the label (e.g. made by a test run). */
  deleteUnlabeled?: boolean;
}

export interface RestoreResult {
  label: string;
  /** Documents that got the labeled content as a new version. */
  restored: number;
  /** Deleted documents brought back. */
  undeleted: number;
  /** Documents without the label that were deleted (deleteUnlabeled). */
  deleted: number;
  /** Documents already at the labeled content. */
  unchanged: number;
  /** The collections where something changed. */
  collections: string[];
}

export interface TreeRestoreResult extends RestoreResult {
  tree: string;
}

export interface CollectionInfo {
  name: string;
  count: number;
  updatedAt: string;
}

export interface Schema {
  collection: string;
  collectionType: "json" | "binary";
  schema: Record<string, unknown> | null;
  displayName: string | null;
  naturalKey: string | null;
  listColumns: string[] | null;
  indexes: Array<{ path: string; kind: "btree" | "gin" | "trigram" }> | null;
  updatedAt: string;
  /** Existing documents whose key was registered when `naturalKey` was set (PUT/PATCH). */
  keysRegistered?: number;
}

/** Only the fields to change; `null` clears a field. */
export interface PatchSchemaOptions {
  schema?: Record<string, unknown> | null;
  displayName?: string | null;
  collectionType?: "json" | "binary";
  naturalKey?: string | null;
  listColumns?: string[] | null;
  indexes?: Array<{ path: string; kind: "btree" | "gin" | "trigram" }> | null;
}

export interface SetSchemaOptions {
  schema?: Record<string, unknown>;
  displayName?: string;
  collectionType?: "json" | "binary";
  naturalKey?: string;
  listColumns?: string[];
  indexes?: Array<{ path: string; kind: "btree" | "gin" | "trigram" }>;
}

export interface FileUploadOptions {
  /** Upload only if the file is still at this version (0: only create; "*": only replace). */
  ifVersion?: number | "*";
  /** The file's MIME type, when `content` isn't a Blob that carries one. */
  contentType?: string;
}

export interface FileDownloadOptions {
  /** A version number to download instead of the current one. */
  version?: number;
  /** Download the version carrying this label. */
  label?: string;
}

export interface TreeInfo {
  name: string;
  count: number;
}

export interface TreeNodeResult {
  path: string;
  document: DocumentResponse | null;
  assignmentDocId: string | null;
  children: Array<{ path: string; documentId: string | null }>;
}

export interface TreePromoteOptions {
  /** Label to point at the promoted versions. Defaults to "published" on the server. */
  label?: string;
  /**
   * Promote the version carrying this label (e.g. "preview"). Documents without
   * it are left alone. Omitted: each document's current version is promoted.
   */
  from?: string;
}

export interface TreePromoteResult {
  tree: string;
  label: string;
  from: string | null;
  promoted: Array<{ path: string; documentId: string; collection: string; version: number }>;
}

export interface FullTree {
  tree: string;
  nodes: Array<{ path: string; documentId: string; document: DocumentResponse }>;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface InviteCreated extends Invite {
  token: string;
}

export interface ReceivedInvite {
  id: string;
  orgId: string;
  orgName: string;
  orgEmail: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface Permission {
  id: string;
  principal: string;
  resource: string;
  access: "none" | "read" | "write" | "admin";
  labelFilter: string | null;
  filterLang: "jq" | "jmespath" | "jsonata" | null;
  filterExpr: string | null;
  alias: string | null;
  auditReads: boolean;
  auditWrites: boolean;
  createdAt: string;
}

export interface CreatePermissionOptions {
  principal: string;
  resource: string;
  access: "none" | "read" | "write" | "admin";
  labelFilter?: string;
  filterLang?: "jq" | "jmespath" | "jsonata";
  filterExpr?: string;
  alias?: string | null;
  auditReads?: boolean;
  auditWrites?: boolean;
}

export interface UpdatePermissionOptions {
  access?: "none" | "read" | "write" | "admin";
  labelFilter?: string;
  filterLang?: "jq" | "jmespath" | "jsonata";
  filterExpr?: string;
  alias?: string | null;
  auditReads?: boolean;
  auditWrites?: boolean;
}

export interface ListDocumentsOptions {
  label?: string;
  // Comma-separated field paths to project, e.g. "title,author.name"
  select?: string;
  // Filter expression, e.g. "status:published" or "price>10"
  where?: string;
  // Page size (server default 50, max 200)
  limit?: number;
  // Number of documents to skip, for paging with limit
  offset?: number;
  depth?: number;
}

export interface DocumentGetOptions {
  label?: string;
  depth?: number;
}

export interface QueryRequest {
  where?: string;
  select?: string[];
  aggregate?: { groupBy?: string[]; metrics?: Record<string, Record<string, string>> };
  label?: string;
  limit?: number;
  cursor?: string;
}

export interface QueryResult {
  items?: Array<{ id: string; version: number; data: Record<string, unknown> }>;
  rows?: Array<Record<string, unknown>>;
  cursor?: string | null;
}

export interface MaterializedQuery {
  name: string;
  refreshOn: string;
  resultDocId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterializedResult {
  collection: string;
  name: string;
  result: { id: string; version: number; data: Record<string, unknown> };
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  consecFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookCreated extends Webhook {
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  batchKey: string;
  eventCount: number;
  attempt: number;
  statusCode: number | null;
  error: string | null;
  deliveredAt: string;
}

export interface ValidateSchemaResult {
  collection: string;
  schemaSource: "current" | "proposed";
  checked: number;
  valid: number;
  invalid: number;
  failures: Array<{ id: string; version: number; errors: string[] }>;
}

/** Retention rules; a version is removed if any rule says so. Current and labeled versions are always kept. */
export interface RetentionRules {
  /** Keep only labeled versions. */
  labeledOnly?: boolean;
  /** Keep the newest n versions (the current one counts). */
  maxVersions?: number | null;
  /** Remove versions older than n days. */
  maxAgeDays?: number | null;
  /** Remove versions older than the version this label points to. */
  afterLabel?: string | null;
}

export interface RetentionPolicy {
  /** The collection, or "*" for the org default. */
  collection: string;
  labeledOnly: boolean;
  maxVersions: number | null;
  maxAgeDays: number | null;
  afterLabel: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface RetentionRun {
  collection: string;
  versionsRemoved: number;
  bytesFreed: number;
  /** The user who applied the policies, or "schedule" for the hourly run. */
  triggeredBy: string | null;
  ranAt: string;
}

export interface RetentionOverview {
  default: RetentionPolicy | null;
  collections: RetentionPolicy[];
  runs: RetentionRun[];
}

export interface RetentionCount {
  versions: number;
  documents: number;
  bytes: number;
}

export interface RetentionResult {
  /** Only collections where something is (or would be) removed. */
  collections: Array<RetentionCount & { collection: string }>;
  total: RetentionCount;
}
