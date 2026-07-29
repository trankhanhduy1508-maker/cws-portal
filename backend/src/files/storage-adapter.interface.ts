export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
export interface StorageAdapter {
  listObjectsByPrefix(prefix: string): Promise<string[]>;
  getPrivateObject(key: string): Promise<Buffer>;
  putPrivateObject(key: string, buffer: Buffer, contentType: string): Promise<string>;
}
