import type { WrenClient } from "../client.ts";
import type {
  CollectionInfo,
  PatchSchemaOptions,
  Schema,
  SetSchemaOptions,
  ValidateSchemaResult,
} from "../types.ts";

export class CollectionsResource {
  constructor(private readonly client: WrenClient) {}

  list(): Promise<{ collections: CollectionInfo[] }> {
    return this.client.request<{ collections: CollectionInfo[] }>("GET", "/collections");
  }

  getSchema(collection: string): Promise<Schema> {
    return this.client.request<Schema>("GET", `/${collection}/_schema`);
  }

  setSchema(collection: string, opts: SetSchemaOptions): Promise<Schema> {
    return this.client.request<Schema>("PUT", `/${collection}/_schema`, opts);
  }

  /**
   * Change only the given schema fields (the others keep their values; `null` clears
   * one). Creates the schema if the collection has none yet.
   */
  patchSchema(collection: string, changes: PatchSchemaOptions): Promise<Schema> {
    return this.client.request<Schema>("PATCH", `/${collection}/_schema`, changes);
  }

  deleteSchema(collection: string): Promise<{ collection: string; deleted: true }> {
    return this.client.request<{ collection: string; deleted: true }>(
      "DELETE",
      `/${collection}/_schema`,
    );
  }

  validate(
    collection: string,
    proposedSchema?: Record<string, unknown>,
  ): Promise<ValidateSchemaResult> {
    return this.client.request<ValidateSchemaResult>(
      "POST",
      `/${collection}/_schema/validate`,
      proposedSchema !== undefined ? { schema: proposedSchema } : undefined,
    );
  }
}
