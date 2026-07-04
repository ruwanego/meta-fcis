export interface Actor {
  id: string;
  roles: string[];
  properties?: Record<string, unknown>;
}
