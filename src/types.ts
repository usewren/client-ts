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
  updatedAt: string;
}

export interface SetSchemaOptions {
  schema?: Record<string, unknown>;
  displayName?: string;
  collectionType?: "json" | "binary";
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
  auditReads?: boolean;
  auditWrites?: boolean;
}

export interface UpdatePermissionOptions {
  access?: "none" | "read" | "write" | "admin";
  labelFilter?: string;
  filterLang?: "jq" | "jmespath" | "jsonata";
  filterExpr?: string;
  auditReads?: boolean;
  auditWrites?: boolean;
}

export interface ListDocumentsOptions {
  label?: string;
  filter?: string;
  limit?: number;
  cursor?: string;
  facets?: string;
}
