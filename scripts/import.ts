/**
 * One-time data import from the Microsoft Access database.
 *
 * Export each Access table to Excel and place the files here:
 *   data/Investors.xlsx       (the Access "Investors" table)
 *   data/LedgerEntries.xlsx   (the Access "LedgerEntries" table)
 *
 * Then run:  npm run db:import
 *
 * Columns are matched by header name (case-insensitive), so column order
 * does not matter. This REPLACES all existing data; pass --force to run
 * against a database that already contains rows.
 */
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data");

type Cell = ExcelJS.CellValue;
type Row = Record<string, Cell>;

// ---------------------------------------------------------------------------
// Spreadsheet reading
// ---------------------------------------------------------------------------

/** Find a file in data/ by name, case-insensitively. */
function resolveFile(name: string): string {
  const direct = path.join(DATA_DIR, name);
  if (fs.existsSync(direct)) return direct;
  if (fs.existsSync(DATA_DIR)) {
    const match = fs
      .readdirSync(DATA_DIR)
      .find((f) => f.toLowerCase() === name.toLowerCase());
    if (match) return path.join(DATA_DIR, match);
  }
  throw new Error(
    `Could not find data/${name}. Export the table from Access to Excel ` +
      `and save it there.`,
  );
}

async function readSheet(name: string): Promise<Row[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolveFile(name));
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`${name} has no worksheets.`);

  const headers: Record<number, string> = {};
  sheet.getRow(1).eachCell((cell, col) => {
    const text = cellText(cell.value).trim();
    if (text) headers[col] = text;
  });
  if (Object.keys(headers).length === 0) {
    throw new Error(`${name}: the first row must contain column headers.`);
  }

  const rows: Row[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Row = {};
    let hasData = false;
    for (const [colText, header] of Object.entries(headers)) {
      const value = row.getCell(Number(colText)).value;
      record[header] = value;
      if (value !== null && value !== undefined && value !== "") hasData = true;
    }
    if (hasData) rows.push(record);
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Cell coercion
// ---------------------------------------------------------------------------

function cellText(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) {
      return v.richText.map((part) => (part as { text: string }).text).join("");
    }
    if ("result" in v) return cellText(v.result as Cell);
    if (typeof v.hyperlink === "string") return v.hyperlink;
  }
  return String(value);
}

function get(row: Row, field: string): Cell {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === field.toLowerCase(),
  );
  return key ? row[key] : undefined;
}

function asString(value: Cell): string | null {
  const text = cellText(value).trim();
  return text.length ? text : null;
}

function requireString(value: Cell, field: string, rowNum: number): string {
  const text = asString(value);
  if (text === null) throw new Error(`Row ${rowNum}: ${field} is required.`);
  return text;
}

function fit(
  value: string | null,
  max: number,
  field: string,
  rowNum: number,
): string | null {
  if (value !== null && value.length > max) {
    throw new Error(
      `Row ${rowNum}: ${field} is ${value.length} characters; the limit is ${max}. ` +
        `Value: "${value}"`,
    );
  }
  return value;
}

function asInt(value: Cell, field: string, rowNum: number): number {
  if (typeof value === "number") return Math.round(value);
  const text = cellText(value).trim().replace(/,/g, "");
  if (text === "") throw new Error(`Row ${rowNum}: ${field} is required.`);
  const n = Number(text);
  if (!Number.isFinite(n)) {
    throw new Error(`Row ${rowNum}: ${field} "${text}" is not a number.`);
  }
  return Math.round(n);
}

function asMoneyOrNull(value: Cell): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const text = cellText(value).trim().replace(/[$,]/g, "");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function asBool(value: Cell): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0; // Access: -1 = true
  const text = cellText(value).trim().toLowerCase();
  return ["true", "yes", "y", "-1", "1", "on", "checked"].includes(text);
}

function asDate(value: Cell, field: string, rowNum: number): Date {
  if (value instanceof Date) return value;
  const text = cellText(value).trim();
  if (text === "") throw new Error(`Row ${rowNum}: ${field} is required.`);
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Row ${rowNum}: ${field} "${text}" is not a valid date.`);
  }
  return d;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function chunkedCreate<T>(
  label: string,
  items: T[],
  create: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  const size = 100;
  for (let i = 0; i < items.length; i += size) {
    await create(items.slice(i, i + size));
    process.stdout.write(
      `\r  ${label}: ${Math.min(i + size, items.length)} / ${items.length}`,
    );
  }
  process.stdout.write("\n");
}

async function main() {
  const force = process.argv.includes("--force");

  console.log("Reading data/Investors.xlsx ...");
  const investorRows = await readSheet("Investors.xlsx");
  console.log(`  ${investorRows.length} investor row(s).`);

  console.log("Reading data/LedgerEntries.xlsx ...");
  const ledgerRows = await readSheet("LedgerEntries.xlsx");
  console.log(`  ${ledgerRows.length} ledger row(s).`);

  // -- Map investors --------------------------------------------------------
  const seenKeys = new Set<number>();
  const investors = investorRows.map((row, index) => {
    const rowNum = index + 2;
    const investorKey = asInt(get(row, "InvestorKey"), "InvestorKey", rowNum);
    if (seenKeys.has(investorKey)) {
      throw new Error(
        `Investors row ${rowNum}: duplicate InvestorKey ${investorKey}.`,
      );
    }
    seenKeys.add(investorKey);
    return {
      investorKey,
      investorName: fit(
        requireString(get(row, "InvestorName"), "InvestorName", rowNum),
        200,
        "InvestorName",
        rowNum,
      )!,
      investorAltName: fit(asString(get(row, "InvestorAltName")), 200, "InvestorAltName", rowNum),
      investorAddress1: fit(asString(get(row, "InvestorAddress1")), 300, "InvestorAddress1", rowNum),
      investorCity: fit(asString(get(row, "InvestorCity")), 100, "InvestorCity", rowNum),
      investorState: fit(asString(get(row, "InvestorState")), 2, "InvestorState", rowNum),
      investorPostCode: fit(asString(get(row, "InvestorPostCode")), 20, "InvestorPostCode", rowNum),
      investorCountry: fit(asString(get(row, "InvestorCountry")), 100, "InvestorCountry", rowNum),
      investorEmail: fit(asString(get(row, "InvestorEmail")), 200, "InvestorEmail", rowNum),
      investorEIN: fit(asString(get(row, "InvestorEIN")), 20, "InvestorEIN", rowNum),
      investorPhone1: fit(asString(get(row, "InvestorPhone1")), 40, "InvestorPhone1", rowNum),
      investorPhone2: fit(asString(get(row, "InvestorPhone2")), 40, "InvestorPhone2", rowNum),
      treasury: asBool(get(row, "Treasury")),
      founder: asBool(get(row, "Founder")),
      boardOfManagers: asBool(get(row, "BoardOfManagers")),
      officer: asBool(get(row, "Officer")),
      formerOfficer: asBool(get(row, "FormerOfficer")),
      repettiAffiliate: asBool(get(row, "RepettiAffiliate")),
      inactive: asBool(get(row, "Inactive")),
      investorNotes: asString(get(row, "InvestorNotes")),
    };
  });

  // -- Map ledger entries ---------------------------------------------------
  const ledger = ledgerRows.map((row, index) => {
    const rowNum = index + 2;
    return {
      ledgerEntryDate: asDate(get(row, "LedgerEntryDate"), "LedgerEntryDate", rowNum),
      investorKey: asInt(get(row, "InvestorKey"), "InvestorKey", rowNum),
      transactionKey: fit(
        requireString(get(row, "TransactionKey"), "TransactionKey", rowNum),
        60,
        "TransactionKey",
        rowNum,
      )!,
      unitType: fit(
        requireString(get(row, "UnitType"), "UnitType", rowNum),
        1,
        "UnitType",
        rowNum,
      )!,
      unitSubType: fit(asString(get(row, "UnitSubType")), 10, "UnitSubType", rowNum),
      amount: asMoneyOrNull(get(row, "Amount")),
      originalIssuance: asBool(get(row, "OriginalIssuance")),
      quantity: asInt(get(row, "Quantity"), "Quantity", rowNum),
      notes: asString(get(row, "Notes")),
      reversalOfTransactionKey: fit(
        asString(get(row, "ReversalOfTransactionKey")),
        60,
        "ReversalOfTransactionKey",
        rowNum,
      ),
    };
  });

  // -- Referential check ----------------------------------------------------
  for (const [index, entry] of ledger.entries()) {
    if (!seenKeys.has(entry.investorKey)) {
      throw new Error(
        `LedgerEntries row ${index + 2}: InvestorKey ${entry.investorKey} ` +
          `does not exist in Investors.xlsx.`,
      );
    }
  }

  // -- Write ----------------------------------------------------------------
  const existing =
    (await prisma.investor.count()) + (await prisma.ledgerEntry.count());
  if (existing > 0 && !force) {
    throw new Error(
      `The database already contains ${existing} row(s). ` +
        `Re-run with --force to replace all existing data:  npm run db:import -- --force`,
    );
  }

  console.log("Clearing existing data ...");
  await prisma.ledgerEntry.deleteMany();
  await prisma.investor.deleteMany();

  await chunkedCreate("Investors", investors, (batch) =>
    prisma.investor.createMany({ data: batch }),
  );
  await chunkedCreate("LedgerEntries", ledger, (batch) =>
    prisma.ledgerEntry.createMany({ data: batch }),
  );

  console.log(
    `\nImport complete: ${investors.length} investors, ${ledger.length} ledger entries.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(`\nImport failed: ${error.message}`);
    await prisma.$disconnect();
    process.exit(1);
  });
