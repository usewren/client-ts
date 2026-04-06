import type { WrenClient } from "../client.ts";
import type { CollectionInfo, Schema, SetSchemaOptions } from "../types.ts";

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

  deleteSchema(collection: string): Promise<{ collection: string; deleted: true }> {
    return this.client.request<{ collection: string; deleted: true }>(
      "DELETE",
      `/${collection}/_schema`,
    );
  }
}
