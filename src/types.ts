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
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface DocumentList {
  collection: string;
  total: number;
  cursor: string | null;
  facets: Record<string, FacetValue[]>;
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

export interface DiffResult {
  id: string;
  collection: string;
  v1: number;
  v2: number;
  diff: DiffEntry[];
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
}

export interface SetSchemaOptions {
  schema?: Record<string, unknown>;
  displayName?: string;
  collectionType?: "json" | "binary";
  naturalKey?: string;
  listColumns?: string[];
  indexes?: Array<{ path: string; kind: "btree" | "gin" | "trigram" }>;
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
  filter?: string;
  select?: string;
  where?: string;
  limit?: number;
  cursor?: string;
  facets?: string;
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
