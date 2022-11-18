export interface Common<T> {
  jsonrpc: string;
  id: string;
  error?: string;
  result: T;
}
