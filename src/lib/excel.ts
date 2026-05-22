import "server-only";
import ExcelJS from "exceljs";
import type { InvestorDTO, LedgerEntryDTO } from "@/lib/investors";

export interface LedgerExportRow {
  entry: LedgerEntryDTO;
  counterParty: string;
}

/**
 * Build the "Excel Member" workbook: one row per ledger entry for an investor.
 * Columns mirror the Access InvestorHistoryExportQuery.
 */
export async function buildInvestorWorkbook(
  investor: InvestorDTO,
  rows: LedgerExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FANT";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Investor History");

  sheet.columns = [
    { header: "Investor Name", key: "investorName", width: 28 },
    { header: "Alternative Name", key: "investorAltName", width: 24 },
    { header: "Address 1", key: "investorAddress1", width: 28 },
    { header: "City", key: "investorCity", width: 18 },
    { header: "State", key: "investorState", width: 8 },
    { header: "Post Code", key: "investorPostCode", width: 12 },
    { header: "Country", key: "investorCountry", width: 16 },
    { header: "Email", key: "investorEmail", width: 26 },
    { header: "Phone 1", key: "investorPhone1", width: 16 },
    { header: "Phone 2", key: "investorPhone2", width: 16 },
    { header: "Treasury", key: "treasury", width: 10 },
    { header: "Ledger Entry Date", key: "ledgerEntryDate", width: 16 },
    { header: "Transaction Key", key: "transactionKey", width: 22 },
    { header: "Unit Type", key: "unitType", width: 10 },
    { header: "Unit Sub Type", key: "unitSubType", width: 14 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Original Issuance", key: "originalIssuance", width: 16 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Notes", key: "notes", width: 36 },
    { header: "Counter Party", key: "counterParty", width: 28 },
    { header: "Investor Key", key: "investorKey", width: 12 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F3A5F" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const { entry, counterParty } of rows) {
    const row = sheet.addRow({
      investorName: investor.investorName,
      investorAltName: investor.investorAltName ?? "",
      investorAddress1: investor.investorAddress1 ?? "",
      investorCity: investor.investorCity ?? "",
      investorState: investor.investorState ?? "",
      investorPostCode: investor.investorPostCode ?? "",
      investorCountry: investor.investorCountry ?? "",
      investorEmail: investor.investorEmail ?? "",
      investorPhone1: investor.investorPhone1 ?? "",
      investorPhone2: investor.investorPhone2 ?? "",
      treasury: investor.treasury ? "Yes" : "No",
      ledgerEntryDate: new Date(entry.ledgerEntryDate),
      transactionKey: entry.transactionKey,
      unitType: entry.unitType,
      unitSubType: entry.unitSubType ?? "",
      amount: entry.amount ?? "",
      originalIssuance: entry.originalIssuance ? "Yes" : "No",
      quantity: entry.quantity,
      notes: entry.notes ?? "",
      counterParty,
      investorKey: investor.investorKey,
    });
    row.getCell("ledgerEntryDate").numFmt = "mm/dd/yyyy";
    row.getCell("amount").numFmt = '"$"#,##0.00';
    row.getCell("quantity").numFmt = "#,##0";
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
