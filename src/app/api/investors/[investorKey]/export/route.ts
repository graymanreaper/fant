import {
  getCounterparties,
  getInvestor,
  getInvestorLedger,
} from "@/lib/investors";
import { buildInvestorWorkbook, type LedgerExportRow } from "@/lib/excel";

export const runtime = "nodejs";

/** "Excel Member": download an investor's ledger history as an .xlsx file. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ investorKey: string }> },
) {
  const key = Number((await context.params).investorKey);
  if (!Number.isInteger(key)) {
    return new Response("Invalid investor key.", { status: 400 });
  }

  const investor = await getInvestor(key);
  if (!investor) {
    return new Response("Investor not found.", { status: 404 });
  }

  const ledger = await getInvestorLedger(key);
  const rows: LedgerExportRow[] = await Promise.all(
    ledger.map(async (entry) => ({
      entry,
      counterParty: await getCounterparties(
        entry.transactionKey,
        entry.ledgerEntryKey,
      ),
    })),
  );

  const workbook = await buildInvestorWorkbook(investor, rows);
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `Investor-${key}-${stamp}.xlsx`;

  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
