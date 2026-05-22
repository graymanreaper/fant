import "server-only";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Editable fields submitted from the Investor form. */
export interface InvestorInput {
  investorName: string;
  investorAltName: string | null;
  investorAddress1: string | null;
  investorCity: string | null;
  investorState: string | null;
  investorPostCode: string | null;
  investorCountry: string | null;
  investorEmail: string | null;
  investorEIN: string | null;
  investorPhone1: string | null;
  investorPhone2: string | null;
  treasury: boolean;
  founder: boolean;
  boardOfManagers: boolean;
  officer: boolean;
  formerOfficer: boolean;
  repettiAffiliate: boolean;
  inactive: boolean;
  investorNotes: string | null;
}

/** Investor record safe to hand to client components (no Decimal/Date). */
export interface InvestorDTO extends InvestorInput {
  investorKey: number;
}

/** Ledger row safe to hand to client components. */
export interface LedgerEntryDTO {
  ledgerEntryKey: number;
  ledgerEntryDate: string;
  investorKey: number;
  transactionKey: string;
  unitType: string;
  unitSubType: string;
  amount: number;
  originalIssuance: boolean;
  quantity: number;
  notes: string | null;
  reversalOfTransactionKey: string | null;
}

export interface InvestorSearchHit {
  investorKey: number;
  investorName: string;
  investorAltName: string | null;
  investorCity: string | null;
  investorState: string | null;
  inactive: boolean;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

type InvestorRow = Awaited<ReturnType<typeof prisma.investor.findUniqueOrThrow>>;
type LedgerRow = Awaited<ReturnType<typeof prisma.ledgerEntry.findFirstOrThrow>>;

function toInvestorDTO(row: InvestorRow): InvestorDTO {
  return {
    investorKey: row.investorKey,
    investorName: row.investorName,
    investorAltName: row.investorAltName,
    investorAddress1: row.investorAddress1,
    investorCity: row.investorCity,
    investorState: row.investorState,
    investorPostCode: row.investorPostCode,
    investorCountry: row.investorCountry,
    investorEmail: row.investorEmail,
    investorEIN: row.investorEIN,
    investorPhone1: row.investorPhone1,
    investorPhone2: row.investorPhone2,
    treasury: row.treasury,
    founder: row.founder,
    boardOfManagers: row.boardOfManagers,
    officer: row.officer,
    formerOfficer: row.formerOfficer,
    repettiAffiliate: row.repettiAffiliate,
    inactive: row.inactive,
    investorNotes: row.investorNotes,
  };
}

function toLedgerDTO(row: LedgerRow): LedgerEntryDTO {
  return {
    ledgerEntryKey: row.ledgerEntryKey,
    ledgerEntryDate: row.ledgerEntryDate.toISOString(),
    investorKey: row.investorKey,
    transactionKey: row.transactionKey,
    unitType: row.unitType,
    unitSubType: row.unitSubType,
    amount: Number(row.amount),
    originalIssuance: row.originalIssuance,
    quantity: row.quantity,
    notes: row.notes,
    reversalOfTransactionKey: row.reversalOfTransactionKey,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Search by name or alternative name.
 * Mirrors the Access query: InvestorName Like '*q*' OR InvestorAltName Like '*q*'.
 */
export async function searchInvestors(query: string): Promise<InvestorSearchHit[]> {
  const q = query.trim();
  const rows = await prisma.investor.findMany({
    where: q
      ? {
          OR: [
            { investorName: { contains: q } },
            { investorAltName: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { investorName: "asc" },
    take: 500,
    select: {
      investorKey: true,
      investorName: true,
      investorAltName: true,
      investorCity: true,
      investorState: true,
      inactive: true,
    },
  });
  return rows;
}

export async function getInvestor(investorKey: number): Promise<InvestorDTO | null> {
  const row = await prisma.investor.findUnique({ where: { investorKey } });
  return row ? toInvestorDTO(row) : null;
}

/** Ledger entries for one investor, newest first. */
export async function getInvestorLedger(investorKey: number): Promise<LedgerEntryDTO[]> {
  const rows = await prisma.ledgerEntry.findMany({
    where: { investorKey },
    orderBy: [{ ledgerEntryDate: "desc" }, { ledgerEntryKey: "desc" }],
  });
  return rows.map(toLedgerDTO);
}

/** Net share balance: the sum of all ledger quantities for an investor. */
export async function getUnitBalance(investorKey: number): Promise<number> {
  const result = await prisma.ledgerEntry.aggregate({
    where: { investorKey },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

/** Next sequential key: max(InvestorKey) + 1 (Access "ChangeBlankKey"). */
export async function getNextInvestorKey(): Promise<number> {
  const result = await prisma.investor.aggregate({ _max: { investorKey: true } });
  return (result._max.investorKey ?? 0) + 1;
}

export async function createInvestor(input: InvestorInput): Promise<InvestorDTO> {
  const row = await prisma.$transaction(async (tx) => {
    const max = await tx.investor.aggregate({ _max: { investorKey: true } });
    const investorKey = (max._max.investorKey ?? 0) + 1;
    return tx.investor.create({ data: { investorKey, ...input } });
  });
  return toInvestorDTO(row);
}

export async function updateInvestor(
  investorKey: number,
  input: InvestorInput,
): Promise<InvestorDTO> {
  const row = await prisma.investor.update({
    where: { investorKey },
    data: input,
  });
  return toInvestorDTO(row);
}

/**
 * Counterparties on a transaction: names of investors with a ledger entry
 * sharing the same TransactionKey, excluding the supplied entry.
 * Mirrors the Access GetInvestorsByTransactionKey() function.
 */
export async function getCounterparties(
  transactionKey: string,
  excludeLedgerEntryKey: number,
): Promise<string> {
  const rows = await prisma.ledgerEntry.findMany({
    where: {
      transactionKey,
      ledgerEntryKey: { not: excludeLedgerEntryKey },
    },
    select: { investor: { select: { investorName: true } } },
  });
  const names = Array.from(new Set(rows.map((r) => r.investor.investorName)));
  return names.join("; ");
}
