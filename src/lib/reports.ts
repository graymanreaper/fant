import "server-only";
import { prisma } from "@/lib/prisma";
import { getCounterparties, type LedgerEntryDTO } from "@/lib/investors";
import { transactionTypeFromKey } from "@/lib/transaction-types";

type LedgerRow = {
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
  investor: {
    investorName: string;
    investorAltName: string | null;
    inactive: boolean;
  };
};

function boolAsAccess(value: boolean): number {
  return value ? -1 : 0;
}

function toLedgerDTO(row: LedgerRow): LedgerEntryDTO {
  return {
    ledgerEntryKey: row.ledgerEntryKey,
    ledgerEntryDate: row.ledgerEntryDate.toISOString(),
    investorKey: row.investorKey,
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

export async function getAllInvestorHistoryReport() {
  const investors = await prisma.investor.findMany({
    orderBy: { investorName: "asc" },
    include: {
      ledgerEntries: {
        orderBy: [{ ledgerEntryDate: "asc" }, { ledgerEntryKey: "asc" }],
      },
    },
  });

  return Promise.all(
    investors.map(async (investor) => {
      const rows = await Promise.all(
        investor.ledgerEntries.map(async (entry) => ({
          entry: {
            ledgerEntryKey: entry.ledgerEntryKey,
            ledgerEntryDate: entry.ledgerEntryDate.toISOString(),
            investorKey: entry.investorKey,
            transactionKey: entry.transactionKey,
            unitType: entry.unitType,
            unitSubType: entry.unitSubType,
            amount: entry.amount === null ? null : Number(entry.amount),
            originalIssuance: entry.originalIssuance,
            quantity: entry.quantity,
            notes: entry.notes,
            reversalOfTransactionKey: entry.reversalOfTransactionKey,
          },
          counterParty: await getCounterparties(
            entry.transactionKey,
            entry.ledgerEntryKey,
          ),
        })),
      );
      return { investor, rows };
    }),
  );
}

export async function getLedgerHistoryReport() {
  const rows = await prisma.ledgerEntry.findMany({
    orderBy: [{ ledgerEntryDate: "asc" }, { transactionKey: "asc" }],
    include: {
      investor: {
        select: {
          investorName: true,
          investorAltName: true,
          inactive: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    entry: toLedgerDTO(row),
    investorName: row.investor.investorName,
    investorAltName: row.investor.investorAltName,
    status: row.investor.inactive ? "Inactive" : "Active",
    type: transactionTypeFromKey(row.transactionKey),
  }));
}

export async function getCapChartSummary() {
  const rows = await prisma.ledgerEntry.findMany({
    select: {
      unitType: true,
      quantity: true,
      investor: { select: { inactive: true } },
    },
  });
  const groups = new Map<string, { unitType: string; status: string; sumOfQuan: number }>();
  for (const row of rows) {
    const status = row.investor.inactive ? "Inactive" : "Active";
    const key = `${row.unitType}|${status}`;
    const current = groups.get(key) ?? {
      unitType: row.unitType,
      status,
      sumOfQuan: 0,
    };
    current.sumOfQuan += row.quantity;
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort(
    (a, b) => a.unitType.localeCompare(b.unitType) || a.status.localeCompare(b.status),
  );
}

export async function getCapChartDetail(throughDate: string) {
  const through = new Date(`${throughDate}T23:59:59.999Z`);
  const investors = await prisma.investor.findMany({
    orderBy: { investorName: "asc" },
    include: {
      ledgerEntries: {
        where: { ledgerEntryDate: { lte: through } },
        select: { unitType: true, quantity: true },
      },
    },
  });

  return investors
    .map((investor) => {
      let classA = 0;
      let classB = 0;
      for (const entry of investor.ledgerEntries) {
        if (entry.unitType === "A") classA += entry.quantity;
        if (entry.unitType === "B") classB += entry.quantity;
      }
      return {
        treasury: boolAsAccess(investor.treasury),
        investorName: investor.investorName,
        investorAltName: investor.investorAltName ?? "",
        affiliate: boolAsAccess(investor.repettiAffiliate),
        founder: boolAsAccess(investor.founder),
        boardOfManagers: boolAsAccess(investor.boardOfManagers),
        officer: boolAsAccess(investor.officer),
        formerOfficer: boolAsAccess(investor.formerOfficer),
        A: classA,
        B: classB,
      };
    })
    .filter((row) => row.A !== 0 || row.B !== 0 || row.treasury !== 0);
}

export async function getExcelExportRows() {
  const investors = await prisma.investor.findMany({
    orderBy: { investorName: "asc" },
    include: {
      ledgerEntries: {
        select: { unitType: true, quantity: true },
      },
    },
  });
  const exportDate = new Date();

  return investors.map((investor) => {
    let classA = 0;
    let classB = 0;
    for (const entry of investor.ledgerEntries) {
      if (entry.unitType === "A") classA += entry.quantity;
      if (entry.unitType === "B") classB += entry.quantity;
    }
    return {
      exportDate,
      investorName: investor.investorName,
      investorAltName: investor.investorAltName ?? "",
      investorEmail: investor.investorEmail ?? "",
      ein: investor.investorEIN ?? "",
      investorNotes: investor.investorNotes ?? "",
      A: classA,
      B: classB,
    };
  });
}

export async function getTransactionReversalStatus(transactionKeys: string[]) {
  const uniqueKeys = Array.from(new Set(transactionKeys));
  if (uniqueKeys.length === 0) return new Map<string, boolean>();

  const reversalKeys = uniqueKeys.map((key) => `${key}_REV`);
  const rows = await prisma.ledgerEntry.findMany({
    where: {
      OR: [
        { reversalOfTransactionKey: { in: uniqueKeys } },
        { transactionKey: { in: reversalKeys } },
      ],
    },
    select: { transactionKey: true, reversalOfTransactionKey: true },
  });

  const status = new Map(uniqueKeys.map((key) => [key, false]));
  for (const row of rows) {
    if (row.reversalOfTransactionKey) {
      status.set(row.reversalOfTransactionKey, true);
    }
    if (row.transactionKey.endsWith("_REV")) {
      status.set(row.transactionKey.slice(0, -4), true);
    }
  }
  return status;
}
