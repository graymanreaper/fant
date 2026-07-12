import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { getAllInvestorHistoryReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function InvestorHistoryReportPage() {
  const investors = await getAllInvestorHistoryReport();

  return (
    <div>
      <div className="print-actions">
        <PrintButton />{" "}
        <Link href="/reports" className="btn no-print">
          Back to Reports
        </Link>
      </div>

      <div className="card print-report">
        <h1 className="page-title">Fanta-Z Investor History Report</h1>
        <p className="muted">Generated {formatDate(new Date())}</p>

        {investors.map(({ investor, rows }) => {
          const totalA = rows.reduce(
            (sum, row) => sum + (row.entry.unitType === "A" ? row.entry.quantity : 0),
            0,
          );
          const totalB = rows.reduce(
            (sum, row) => sum + (row.entry.unitType === "B" ? row.entry.quantity : 0),
            0,
          );

          return (
            <section className="report-block" key={investor.investorKey}>
              <h2 className="section-title">
                {investor.investorName}{" "}
                <span className="muted">#{investor.investorKey}</span>
              </h2>
              <table className="grid compact-report">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction Key</th>
                    <th>Class</th>
                    <th>Class Sub</th>
                    <th>Amount</th>
                    <th>Orig. Iss.</th>
                    <th>Quantity</th>
                    <th>Notes</th>
                    <th>Counter Party</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ entry, counterParty }) => (
                    <tr key={entry.ledgerEntryKey}>
                      <td>{formatDate(entry.ledgerEntryDate)}</td>
                      <td>{entry.transactionKey}</td>
                      <td>{entry.unitType}</td>
                      <td>{entry.unitSubType ?? ""}</td>
                      <td className="num">{formatCurrency(entry.amount)}</td>
                      <td>{entry.originalIssuance ? "Yes" : ""}</td>
                      <td className={`num ${entry.quantity < 0 ? "neg" : ""}`}>
                        {formatQuantity(entry.quantity)}
                      </td>
                      <td>{entry.notes ?? ""}</td>
                      <td>{counterParty}</td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="muted">
                        No ledger entries.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <div className="table-total">
                <span>Total Class A: {formatQuantity(totalA)}</span>
                <span>Total Class B: {formatQuantity(totalB)}</span>
                <strong>Total Units: {formatQuantity(totalA + totalB)}</strong>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
