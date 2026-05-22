import "server-only";
import { prisma } from "@/lib/prisma";
import {
  TRANSACTION_TYPES,
  transactionTypeFromKey,
  type TransactionTypeId,
} from "@/lib/transaction-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionEntry {
  ledgerEntryKey: number;
  ledgerEntryDate: string;
  investorKey: number;
  investorName: string;
  transactionKey: string;
  unitType: string;
  unitSubType: string | null;
  amount: number | null;
  originalIssuance: boolean;
  quantity: number;
  notes: string | null;
  reversalOfTransactionKey: string | null;
}

export interface TransactionSummary {
  transactionKey: string;
  date: string;
  type: string;
  unitType: string;
  entryCount: number;
  unitsMoved: number;
  reversed: boolean;
}

export interface TransactionDetail {
  transactionKey: string;
  date: string;
  type: string;
  unitType: string;
  unitSubType: string | null;
  amount: number | null;
  notes: string | null;
  entries: TransactionEntry[];
  /** A reversal of this transaction already exists. */
  reversed: boolean;
  /** This transaction is itself a reversal of another. */
  isReversal: boolean;
}

export interface InvestorOption {
  investorKey: number;
  investorName: string;
  investorAltName: string | null;
  treasury: boolean;
  inactive: boolean;
}

export interface PostTransactionLine {
  investorKey: number;
  quantity: number;
}

export interface PostTransactionInput {
  type: TransactionTypeId;
  transactionDate: string;
  dateIsEstimate: boolean;
  unitType: string;
  unitSubType: string | null;
  amount: number | null;
  transactionKey: string;
  notes: string;
  lines: PostTransactionLine[];
}

export type PostResult =
  | { ok: true; transactionKey: string }
  | { ok: false; error: string };

export type ReverseResult =
  | { ok: true; reversalKey: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EntryRow = {
  ledgerEntryKey: number;
  ledgerEntryDate: Date;
  investorKey: number;
  transactionKey: string;
  unitType: string;
  unitSubType: string | null;
  amount: { toString(): string } | null;
  originalIssuance: boolean;
  quantity: number;
  notes: string | null;
  reversalOfTransactionKey: string | null;
  investor: { investorName: string };
};

function toEntry(row: EntryRow): TransactionEntry {
  return {
    ledgerEntryKey: row.ledgerEntryKey,
    ledgerEntryDate: row.ledgerEntryDate.toISOString(),
    investorKey: row.investorKey,
    investorName: row.investor.investorName,
    transactionKey: row.transactionKey,
    unitType: row.unitType,
    unitSubType: row.unitSubType,
    amount: row.amount === null ? null : Number(row.amount),
    originalIssuance: row.originalIssuance,
    quantity: row.quantity,
    notes: row.notes,
    reversalOfTransactionKey: row.reversalOfTransactionKey,
  };
}

/** Build the stored datetime; an estimated date is parked at 23:59 UTC. */
function buildEntryDate(dateText: string, isEstimate: boolean): Date {
  return new Date(`${dateText}T${isEstimate ? "23:59:00" : "00:00:00"}.000Z`);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All transactions, grouped from the ledger, newest first. */
export async function listTransactions(
  query: string,
): Promise<TransactionSummary[]> {
  const q = query.trim();
  const rows = await prisma.ledgerEntry.findMany({
    where: q ? { transactionKey: { contains: q } } : undefined,
    orderBy: { ledgerEntryDate: "desc" },
    include: { investor: { select: { investorName: true } } },
  });

  // A transaction is "reversed" if a *_REV key exists or an entry points back.
  const allKeys = new Set(rows.map((r) => r.transactionKey));
  const reversedTargets = new Set(
    rows
      .map((r) => r.reversalOfTransactionKey)
      .filter((k): k is string => Boolean(k)),
  );
  const isReversed = (key: string) =>
    reversedTargets.has(key) || allKeys.has(`${key}_REV`);

  const groups = new Map<string, TransactionSummary>();
  for (const row of rows) {
    let summary = groups.get(row.transactionKey);
    if (!summary) {
      summary = {
        transactionKey: row.transactionKey,
        date: row.ledgerEntryDate.toISOString(),
        type: transactionTypeFromKey(row.transactionKey),
        unitType: row.unitType,
        entryCount: 0,
        unitsMoved: 0,
        reversed: isReversed(row.transactionKey),
      };
      groups.set(row.transactionKey, summary);
    }
    summary.entryCount += 1;
    if (row.quantity > 0) summary.unitsMoved += row.quantity;
  }
  return Array.from(groups.values());
}

export async function getTransaction(
  transactionKey: string,
): Promise<TransactionDetail | null> {
  const rows = await prisma.ledgerEntry.findMany({
    where: { transactionKey },
    orderBy: [{ quantity: "desc" }, { ledgerEntryKey: "asc" }],
    include: { investor: { select: { investorName: true } } },
  });
  if (rows.length === 0) return null;

  const entries = rows.map(toEntry);
  const first = entries[0];

  const [reversalPointer, revKey] = await Promise.all([
    prisma.ledgerEntry.findFirst({
      where: { reversalOfTransactionKey: transactionKey },
      select: { ledgerEntryKey: true },
    }),
    prisma.ledgerEntry.findFirst({
      where: { transactionKey: `${transactionKey}_REV` },
      select: { ledgerEntryKey: true },
    }),
  ]);

  return {
    transactionKey,
    date: first.ledgerEntryDate,
    type: transactionTypeFromKey(transactionKey),
    unitType: first.unitType,
    unitSubType: first.unitSubType,
    amount: entries.find((e) => e.amount !== null)?.amount ?? null,
    notes: first.notes,
    entries,
    reversed: Boolean(reversalPointer) || Boolean(revKey),
    isReversal:
      transactionKey.endsWith("_REV") ||
      entries.some((e) => e.reversalOfTransactionKey),
  };
}

/** Auto-generate the next TransactionKey for a type and date. */
export async function getNextTransactionKey(
  type: TransactionTypeId,
  date: string,
): Promise<string> {
  const draft = `${TRANSACTION_TYPES[type].keyPrefix}_${date}`;
  const existing = await prisma.ledgerEntry.findMany({
    where: { transactionKey: { startsWith: `${draft}_` } },
    select: { transactionKey: true },
    distinct: ["transactionKey"],
  });
  let max = 0;
  for (const { transactionKey } of existing) {
    const suffix = Number.parseInt(transactionKey.slice(draft.length + 1), 10);
    if (Number.isInteger(suffix) && suffix > max) max = suffix;
  }
  return `${draft}_${max + 1}`;
}

/** Investors for the wizard's transferor / transferee pickers. */
export async function getInvestorOptions(): Promise<InvestorOption[]> {
  return prisma.investor.findMany({
    orderBy: { investorName: "asc" },
    select: {
      investorKey: true,
      investorName: true,
      investorAltName: true,
      treasury: true,
      inactive: true,
    },
  });
}

/** Net unit balance per investor and unit class (for the sale "enough units" check). */
export async function getClassUnitTotals(): Promise<Record<string, number>> {
  const rows = await prisma.ledgerEntry.groupBy({
    by: ["investorKey", "unitType"],
    _sum: { quantity: true },
  });
  const totals: Record<string, number> = {};
  for (const row of rows) {
    totals[`${row.investorKey}|${row.unitType}`] = row._sum.quantity ?? 0;
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Post a balanced double-entry transaction (Access PostTransaction_Click). */
export async function postTransaction(
  input: PostTransactionInput,
): Promise<PostResult> {
  const def = TRANSACTION_TYPES[input.type];

  if (input.lines.length === 0) {
    return { ok: false, error: "Add at least one transaction line." };
  }
  const balance = input.lines.reduce((sum, line) => sum + line.quantity, 0);
  if (balance !== 0) {
    return { ok: false, error: `Transaction is out of balance by ${balance}.` };
  }

  const clash = await prisma.ledgerEntry.findFirst({
    where: { transactionKey: input.transactionKey },
    select: { ledgerEntryKey: true },
  });
  if (clash) {
    return {
      ok: false,
      error: `Transaction key "${input.transactionKey}" is already in use.`,
    };
  }

  // Sales: each giving party must hold enough units of this class.
  if (def.id === "sale") {
    const totals = await getClassUnitTotals();
    const outflow = new Map<number, number>();
    for (const line of input.lines) {
      if (line.quantity < 0) {
        outflow.set(
          line.investorKey,
          (outflow.get(line.investorKey) ?? 0) - line.quantity,
        );
      }
    }
    for (const [investorKey, qty] of outflow) {
      const held = totals[`${investorKey}|${input.unitType}`] ?? 0;
      if (held < qty) {
        return {
          ok: false,
          error: `Investor ${investorKey} holds ${held} Class ${input.unitType} units; cannot transfer ${qty}.`,
        };
      }
    }
  }

  const entryDate = buildEntryDate(input.transactionDate, input.dateIsEstimate);

  await prisma.ledgerEntry.createMany({
    data: input.lines.map((line) => ({
      ledgerEntryDate: entryDate,
      investorKey: line.investorKey,
      transactionKey: input.transactionKey,
      unitType: input.unitType,
      unitSubType: def.capturesSubType ? input.unitSubType : null,
      // Amount is recorded against the receiving (positive) side only.
      amount:
        def.capturesAmount && line.quantity > 0 ? input.amount : null,
      originalIssuance: def.originalIssuance,
      quantity: line.quantity,
      notes: input.notes,
    })),
  });

  return { ok: true, transactionKey: input.transactionKey };
}

/**
 * Zero out every entry of a transaction and annotate its notes
 * (Access DelLedgerEntry_Click — a soft delete).
 */
export async function zeroOutTransaction(
  transactionKey: string,
): Promise<number> {
  const rows = await prisma.ledgerEntry.findMany({ where: { transactionKey } });
  await prisma.$transaction(
    rows.map((row) => {
      const amount = row.amount === null ? 0 : Number(row.amount);
      let notes = `DELETED: ${row.notes ?? ""} - Formerly ${row.quantity} units`;
      if (amount !== 0) notes += ` and $${amount}`;
      return prisma.ledgerEntry.update({
        where: { ledgerEntryKey: row.ledgerEntryKey },
        data: { notes, quantity: 0, amount: null },
      });
    }),
  );
  return rows.length;
}

/**
 * Create offsetting reversal entries for a transaction
 * (Access ReverseLedgerEntry_Click / ReverseLedgerEntryAppendQuery).
 */
export async function reverseTransaction(
  transactionKey: string,
  reversalDate: string,
): Promise<ReverseResult> {
  const reversalKey = `${transactionKey}_REV`;

  const [pointer, existingRev, rows] = await Promise.all([
    prisma.ledgerEntry.findFirst({
      where: { reversalOfTransactionKey: transactionKey },
      select: { ledgerEntryKey: true },
    }),
    prisma.ledgerEntry.findFirst({
      where: { transactionKey: reversalKey },
      select: { ledgerEntryKey: true },
    }),
    prisma.ledgerEntry.findMany({ where: { transactionKey } }),
  ]);

  if (pointer || existingRev) {
    return {
      ok: false,
      error: "This transaction has already been reversed.",
    };
  }
  if (rows.length === 0) {
    return { ok: false, error: "Transaction not found." };
  }

  const entryDate = buildEntryDate(reversalDate, false);
  await prisma.ledgerEntry.createMany({
    data: rows.map((row) => ({
      ledgerEntryDate: entryDate,
      investorKey: row.investorKey,
      transactionKey: reversalKey,
      unitType: row.unitType,
      unitSubType: row.unitSubType,
      amount: row.amount === null ? null : Number(row.amount) * -1,
      originalIssuance: false,
      quantity: -row.quantity,
      notes: `Reversal of ${transactionKey}.`,
      reversalOfTransactionKey: transactionKey,
    })),
  });

  return { ok: true, reversalKey };
}
