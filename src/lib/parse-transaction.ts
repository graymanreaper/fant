import type { PostTransactionInput } from "@/lib/transactions";
import { TRANSACTION_TYPES } from "@/lib/transaction-types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a yyyy-mm-dd string and return it, or null. */
export function parseDateText(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === value ? value : null;
}

export type TxParseResult =
  | { ok: true; value: PostTransactionInput }
  | { ok: false; error: string };

/** Validate a transaction-wizard submission (Access PostTransaction checks). */
export function parsePostTransaction(body: unknown): TxParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  const type = b.type;
  if (type !== "sale" && type !== "grant" && type !== "subscription") {
    return { ok: false, error: "Select a transaction type." };
  }
  const def = TRANSACTION_TYPES[type];

  const transactionDate = parseDateText(b.transactionDate);
  if (!transactionDate) {
    return { ok: false, error: "Select a valid transaction date." };
  }

  const unitType = b.unitType;
  if (unitType !== "A" && unitType !== "B") {
    return { ok: false, error: "Select a unit class (A or B)." };
  }

  let unitSubType: string | null = null;
  if (def.capturesSubType) {
    if (b.unitSubType !== "1st" && b.unitSubType !== "2nd") {
      return { ok: false, error: "Select a unit sub type (1st or 2nd)." };
    }
    unitSubType = b.unitSubType;
  }

  let amount: number | null = null;
  if (def.capturesAmount) {
    const n = typeof b.amount === "number" ? b.amount : Number(b.amount);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, error: "Enter a purchase amount greater than zero." };
    }
    amount = n;
  }

  const transactionKey =
    typeof b.transactionKey === "string" ? b.transactionKey.trim() : "";
  if (!transactionKey) {
    return { ok: false, error: "Enter a transaction key." };
  }

  const notes = typeof b.notes === "string" ? b.notes.trim() : "";
  if (!notes) {
    return { ok: false, error: "Enter a note for the transaction." };
  }
  if (notes === def.defaultComment) {
    return { ok: false, error: "Adjust the default note before posting." };
  }

  if (!Array.isArray(b.lines) || b.lines.length === 0) {
    return { ok: false, error: "Add at least one transaction line." };
  }
  const lines: PostTransactionInput["lines"] = [];
  for (const raw of b.lines) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Invalid transaction line." };
    }
    const r = raw as Record<string, unknown>;
    const investorKey = Number(r.investorKey);
    const quantity = Number(r.quantity);
    if (!Number.isInteger(investorKey) || investorKey <= 0) {
      return { ok: false, error: "Invalid investor on a transaction line." };
    }
    if (!Number.isInteger(quantity) || quantity === 0) {
      return {
        ok: false,
        error: "Each line must have a non-zero whole quantity.",
      };
    }
    lines.push({ investorKey, quantity });
  }

  return {
    ok: true,
    value: {
      type,
      transactionDate,
      dateIsEstimate: b.dateIsEstimate === true,
      unitType,
      unitSubType,
      amount,
      transactionKey,
      notes,
      lines,
    },
  };
}
