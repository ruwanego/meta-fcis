export interface Intent {
  name: string;
  payload?: unknown;
}

export interface IntentSet {
  intents: Intent[];
}
