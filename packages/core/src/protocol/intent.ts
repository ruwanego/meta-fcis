export type EntityMutationOperation = "CREATE" | "UPDATE" | "DELETE";

export interface MutateEntityInstruction {
  type: "MUTATE_ENTITY";
  meta: {
    entityName: string;
    operation: EntityMutationOperation;
    targetId?: string;
  };
  payload: Record<string, unknown>;
}

export type MetaInstruction = MutateEntityInstruction;

export interface IntentSet<TResponse = unknown> {
  success: boolean;
  httpStatus: number;
  responsePayload: TResponse;
  intents: MetaInstruction[];
}
