export interface Common<T> {
  jsonrpc: string;
  id: string;
  error?: any;
  result: T;
}
