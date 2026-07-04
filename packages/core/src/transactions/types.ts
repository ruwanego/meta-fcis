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
