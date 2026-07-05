export type TransactionOperationKind =
  | "CREATE"
  | "UPDATE"
  | "DELETE";

export interface CreateOperation {
  kind: "CREATE";
  entity: string;
  payload: Record<string, unknown>;
}

export interface UpdateOperation {
  kind: "UPDATE";
  entity: string;
  targetId: string;
  payload: Record<string, unknown>;
}

export interface DeleteOperation {
  kind: "DELETE";
  entity: string;
  targetId: string;
}

export type TransactionOperation =
  | CreateOperation
  | UpdateOperation
  | DeleteOperation;

export interface TransactionPlan {
  operations: TransactionOperation[];
}

export interface TransactionOperationResult {
  kind: TransactionOperationKind;
  entity: string;
  targetId?: string;
  outcome: "applied";
}

export interface TransactionExecutionResult {
  operations: TransactionOperationResult[];
}

export type TransactionPlanErrorReason =
  | "TRANSACTION_INTENT_UNSUPPORTED"
  | "TRANSACTION_TARGET_REQUIRED"
  | "TRANSACTION_PAYLOAD_INVALID";

export interface TransactionPlanError {
  reason: TransactionPlanErrorReason;
  index?: number;
  details?: unknown;
}

export type TransactionPlanResult =
  | {
      ok: true;
      plan: TransactionPlan;
    }
  | {
      ok: false;
      error: TransactionPlanError;
    };
