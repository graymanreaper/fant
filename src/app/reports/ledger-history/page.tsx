import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { getLedgerHistoryReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function LedgerHistoryReportPage() {
  const rows = await getLedgerHistoryReport();

  return (
    <div>
      <div className="print-actions">
        <PrintButton />{" "}
        <Link href="/reports" className="btn no-print">
          Back to Reports
        </Link>
      </div>

      <div className="card print-report">
        <h1 className="page-title">Ledger History Report</h1>
        <p className="muted">Generated {formatDate(new Date())}</p>

        <table className="grid compact-report">
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction Key</th>
              <th>Type</th>
              <th>Investor</th>
              <th>Alt Name</th>
              <th>Status</th>
              <th>Class</th>
              <th>Class Sub</th>
              <th>Amount</th>
              <th>Quantity</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.entry.ledgerEntryKey}>
                <td>{formatDate(row.entry.ledgerEntryDate)}</td>
                <td>{row.entry.transactionKey}</td>
                <td>{row.type}</td>
                <td>{row.investorName}</td>
                <td>{row.investorAltName ?? ""}</td>
                <td>{row.status}</td>
                <td>{row.entry.unitType}</td>
                <td>{row.entry.unitSubType ?? ""}</td>
                <td className="num">{formatCurrency(row.entry.amount)}</td>
                <td className={`num ${row.entry.quantity < 0 ? "neg" : ""}`}>
                  {formatQuantity(row.entry.quantity)}
                </td>
                <td>{row.entry.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
