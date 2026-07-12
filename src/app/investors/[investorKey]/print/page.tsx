import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCounterparties,
  getInvestor,
  getInvestorLedger,
} from "@/lib/investors";
import { INVESTOR_FLAGS } from "@/lib/investor-fields";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function InvestorPrintPage({
  params,
}: {
  params: Promise<{ investorKey: string }>;
}) {
  const key = Number((await params).investorKey);
  if (!Number.isInteger(key)) notFound();

  const investor = await getInvestor(key);
  if (!investor) notFound();

  const ledger = await getInvestorLedger(key);

  // Ledger sorted oldest first for the printed report.
  const ledgerAsc = [...ledger].sort((a, b) => {
    const da = new Date(a.ledgerEntryDate).getTime();
    const db = new Date(b.ledgerEntryDate).getTime();
    if (da !== db) return da - db;
    return a.ledgerEntryKey - b.ledgerEntryKey;
  });

  const ledgerRows = await Promise.all(
    ledgerAsc.map(async (entry) => ({
      entry,
      counterParty: await getCounterparties(
        entry.transactionKey,
        entry.ledgerEntryKey,
      ),
    })),
  );

  const flags = INVESTOR_FLAGS.filter((flag) => investor[flag.key]);

  const identity: [string, string][] = [
    ["Investor Name", investor.investorName],
    ["Alternative Name", investor.investorAltName ?? ""],
    ["Address 1", investor.investorAddress1 ?? ""],
    ["City", investor.investorCity ?? ""],
    ["State", investor.investorState ?? ""],
    ["Post Code", investor.investorPostCode ?? ""],
    ["Country", investor.investorCountry ?? ""],
    ["Email", investor.investorEmail ?? ""],
    ["EIN", investor.investorEIN ?? ""],
    ["Phone 1", investor.investorPhone1 ?? ""],
    ["Phone 2", investor.investorPhone2 ?? ""],
  ];

  const generatedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Escape any double-quotes so the CSS string stays well-formed.
  const generatedDateCss = generatedDate.replace(/"/g, '\\"');

  const pageCss = `
    @page {
      size: landscape;
      margin: 0.55in 0.5in 0.85in 0.5in;
      @bottom-left {
        content: "${generatedDateCss}";
        font-family: Calibri, "Segoe UI", system-ui, sans-serif;
        font-size: 9pt;
        color: #444;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: Calibri, "Segoe UI", system-ui, sans-serif;
        font-size: 9pt;
        color: #444;
      }
    }
    .print-report {
      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
      font-size: 11pt;
      color: #1a2330;
    }
    .print-report h1.page-title {
      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
      font-size: 18pt;
      font-weight: 700;
      margin: 0 0 12px;
    }
    .print-report h2.section-title {
      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
      font-size: 12pt;
      font-weight: 700;
    }
    .print-report table.grid {
      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
      font-size: 11pt;
    }
    .print-report table.print-ledger {
      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
      font-size: 8pt;
      line-height: 1.15;
    }
    .print-report table.print-ledger th,
    .print-report table.print-ledger td {
      padding: 1px 4px;
    }
    .print-report table.print-ledger th {
      font-size: 8.5pt;
    }
    @media print {
      body { background: #fff; }
      .card { border: none; box-shadow: none; padding: 0; }
      table.grid { page-break-inside: auto; }
      table.grid tr { page-break-inside: avoid; page-break-after: auto; }
    }
    .print-summary-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
      gap: 32px;
      align-items: start;
    }
    .print-classification-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .print-classification-list li {
      padding: 3px 0;
      font-size: 11pt;
    }
    .print-check {
      font-family: "Segoe UI Symbol", "Arial Unicode MS", sans-serif;
      font-size: 11pt;
      text-align: center;
    }
    .print-totals {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
      gap: 24px;
      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
      font-size: 11pt;
      font-weight: 700;
    }
    .print-totals .label {
      color: var(--muted);
      font-weight: 600;
      margin-right: 6px;
    }
    .print-totals .neg {
      color: var(--danger);
    }
  `;

  // Totals for the summary block at the end of the report.
  let totalClassA = 0;
  let totalClassB = 0;
  for (const { entry } of ledgerRows) {
    if (entry.unitType === "A") totalClassA += entry.quantity;
    else if (entry.unitType === "B") totalClassB += entry.quantity;
  }
  const totalUnits = totalClassA + totalClassB;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />

      <div className="print-actions">
        <PrintButton />{" "}
        <Link href={`/investors/${key}`} className="btn no-print">
          Back to Investor
        </Link>
      </div>

      <div className="card print-report">
        <h1 className="page-title">Fanta-Z Investor History Report</h1>

        <div className="print-summary-grid">
          <div>
            <h2 className="section-title">Investor</h2>
            <table className="grid">
              <tbody>
                {identity.map(([label, value]) => (
                  <tr key={label}>
                    <th style={{ width: 160 }}>{label}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="section-title">Classification</h2>
            {flags.length > 0 ? (
              <ul className="print-classification-list">
                {flags.map((flag) => (
                  <li key={flag.key}>
                    <span className="print-check">☑</span> {flag.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">None</p>
            )}
          </div>
        </div>

        <h2 className="section-title" style={{ marginTop: 18 }}>
          Ledger History
        </h2>
        {ledgerRows.length > 0 ? (
          <>
            <table className="grid print-ledger">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Key</th>
                  <th>Class</th>
                  <th>Class Sub</th>
                  <th>Amount</th>
                  <th style={{ width: 50 }}>Orig. Iss.</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                  <th>Counter Party</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map(({ entry, counterParty }) => (
                  <tr key={entry.ledgerEntryKey}>
                    <td>{formatDate(entry.ledgerEntryDate)}</td>
                    <td>{entry.transactionKey}</td>
                    <td>{entry.unitType}</td>
                    <td>{entry.unitSubType}</td>
                    <td className="num">{formatCurrency(entry.amount)}</td>
                    <td className="print-check">
                      {entry.originalIssuance ? "☑" : "☐"}
                    </td>
                    <td className={`num ${entry.quantity < 0 ? "neg" : ""}`}>
                      {formatQuantity(entry.quantity)}
                    </td>
                    <td>{entry.notes ?? ""}</td>
                    <td>{counterParty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="print-totals">
              <div>
                <span className="label">Total Class A:</span>
                <span className={totalClassA < 0 ? "neg" : ""}>
                  {formatQuantity(totalClassA)}
                </span>
              </div>
              <div>
                <span className="label">Total Class B:</span>
                <span className={totalClassB < 0 ? "neg" : ""}>
                  {formatQuantity(totalClassB)}
                </span>
              </div>
              <div>
                <span className="label">Total Units:</span>
                <span className={totalUnits < 0 ? "neg" : ""}>
                  {formatQuantity(totalUnits)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="muted">No ledger entries for this investor.</p>
        )}
      </div>
    </div>
  );
}
