import { IntentSet } from "./intent.js";
import { TransactionPlan } from "../transactions/types.js";

export interface ExecuteRouteResult {
  intentSet: IntentSet;
  transactionPlan: TransactionPlan;
}
