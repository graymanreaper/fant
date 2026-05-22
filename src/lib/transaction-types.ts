// Transaction-type metadata, shared by server and client.
// Mirrors LE_Trans_Type in the Access LedgerEntryWizard (1 = Sale, 2 = Grant,
// 3 = Subscription).

export type TransactionTypeId = "sale" | "grant" | "subscription";

export interface TransactionTypeDef {
  id: TransactionTypeId;
  legacyCode: 1 | 2 | 3;
  label: string;
  /** Prefix of the auto-generated TransactionKey. */
  keyPrefix: string;
  /** Pre-filled note; must be edited before posting. */
  defaultComment: string;
  /** Subscriptions capture a purchase Amount. */
  capturesAmount: boolean;
  /** Subscriptions capture a Unit Sub Type (1st / 2nd). */
  capturesSubType: boolean;
  /** Grants and subscriptions flag their entries as original issuance. */
  originalIssuance: boolean;
  /** Grants and subscriptions draw from a Treasury account only. */
  transferorTreasuryOnly: boolean;
  /**
   * Sales add the giving and receiving sides independently; grants and
   * subscriptions add both sides together from a single recipient entry.
   */
  separateTransferor: boolean;
  transferorLabel: string;
  transferorQtyLabel: string;
  transfereeLabel: string;
  transfereeQtyLabel: string;
}

export const TRANSACTION_TYPES: Record<TransactionTypeId, TransactionTypeDef> = {
  sale: {
    id: "sale",
    legacyCode: 1,
    label: "Sale",
    keyPrefix: "Sale",
    defaultComment:
      "Sale of ___ Class ___ units by _____ to _____ for $______.",
    capturesAmount: false,
    capturesSubType: false,
    originalIssuance: false,
    transferorTreasuryOnly: false,
    separateTransferor: true,
    transferorLabel: "Seller",
    transferorQtyLabel: "Quantity Sold",
    transfereeLabel: "Buyer",
    transfereeQtyLabel: "Quantity Bought",
  },
  grant: {
    id: "grant",
    legacyCode: 2,
    label: "Grant",
    keyPrefix: "Grant",
    defaultComment: "Grant of ___ Class ___ units to _____ for ______.",
    capturesAmount: false,
    capturesSubType: false,
    originalIssuance: true,
    transferorTreasuryOnly: true,
    separateTransferor: false,
    transferorLabel: "Treasury Source",
    transferorQtyLabel: "Quantity",
    transfereeLabel: "Recipient",
    transfereeQtyLabel: "Quantity",
  },
  subscription: {
    id: "subscription",
    legacyCode: 3,
    label: "Subscription",
    keyPrefix: "Subscription",
    defaultComment:
      "Purchase of ___ Class ___ units by _____ for $______. Paid via ______ on _____.",
    capturesAmount: true,
    capturesSubType: true,
    originalIssuance: true,
    transferorTreasuryOnly: true,
    separateTransferor: false,
    transferorLabel: "Treasury Source",
    transferorQtyLabel: "Quantity",
    transfereeLabel: "Purchaser",
    transfereeQtyLabel: "Quantity",
  },
};

export const TRANSACTION_TYPE_LIST: TransactionTypeDef[] = [
  TRANSACTION_TYPES.sale,
  TRANSACTION_TYPES.grant,
  TRANSACTION_TYPES.subscription,
];

export const UNIT_TYPES = ["A", "B"] as const;
export const UNIT_SUBTYPES = ["1st", "2nd"] as const;

/** Best-effort transaction type from a TransactionKey prefix. */
export function transactionTypeFromKey(key: string): string {
  if (key.endsWith("_REV")) return "Reversal";
  for (const def of TRANSACTION_TYPE_LIST) {
    if (key.startsWith(`${def.keyPrefix}_`)) return def.label;
  }
  return "Other";
}
