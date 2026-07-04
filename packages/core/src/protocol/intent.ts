export interface Intent {
  name: string;
  payload?: unknown;
}

export type MetaInstructionOperation = "CREATE" | "UPDATE" | "DELETE";

export interface MetaInstruction {
  type: string;
  meta: {
    entityName?: string;
    operation?: MetaInstructionOperation | string;
    targetId?: string;
  };
  payload: unknown;
}

export interface IntentSet {
  intents: Array<Intent | MetaInstruction>;
}
