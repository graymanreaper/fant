import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCounterparties,
  getInvestor,
  getInvestorLedger,
  getUnitBalance,
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

  const [ledger, unitBalance] = await Promise.all([
    getInvestorLedger(key),
    getUnitBalance(key),
  ]);

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
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 9pt;
        color: #444;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 9pt;
        color: #444;
      }
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
    }
    .print-check {
      font-family: "Segoe UI Symbol", "Arial Unicode MS", sans-serif;
      font-size: 12pt;
      text-align: center;
    }
    .print-balance {
      margin-top: 12px;
      text-align: right;
      font-weight: 700;
      font-size: 14px;
    }
    .print-balance .neg {
      color: var(--danger);
    }
  `;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />

      <div className="print-actions">
        <PrintButton />{" "}
        <Link href={`/investors/${key}`} className="btn no-print">
          Back to Investor
        </Link>
      </div>

      <div className="card">
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
            <table className="grid">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Key</th>
                  <th>Unit</th>
                  <th>Sub</th>
                  <th>Amount</th>
                  <th style={{ width: 60 }}>Orig. Iss.</th>
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
            <p className="print-balance">
              Unit Balance:{" "}
              <span className={unitBalance < 0 ? "neg" : ""}>
                {formatQuantity(unitBalance)}
              </span>
            </p>
          </>
        ) : (
          <p className="muted">No ledger entries for this investor.</p>
        )}
      </div>
    </div>
  );
}
