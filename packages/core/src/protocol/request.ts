export interface Request {
  route: string;
  payload: unknown;
  headers?: Record<string, string>;
}
