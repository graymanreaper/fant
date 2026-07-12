import Link from "next/link";
import { formatDate, formatQuantity } from "@/lib/format";
import { getExcelExportRows } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ExcelExportPage() {
  const rows = await getExcelExportRows();

  return (
    <div>
      <h1 className="page-title">Excel Export</h1>

      <div className="card">
        <div className="button-row" style={{ marginTop: 0 }}>
          <Link href="/reports" className="btn">
            Back to Reports
          </Link>
        </div>
        <table className="grid ledger-table">
          <thead>
            <tr>
              <th>Export Date</th>
              <th>InvestorName</th>
              <th>InvestorAltName</th>
              <th>InvestorEmail</th>
              <th>EIN</th>
              <th>InvestorNotes</th>
              <th>A</th>
              <th>B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.investorName}-${row.investorEmail}`}>
                <td>{formatDate(row.exportDate)}</td>
                <td>{row.investorName}</td>
                <td>{row.investorAltName}</td>
                <td>{row.investorEmail}</td>
                <td>{row.ein}</td>
                <td>{row.investorNotes}</td>
                <td className={`num ${row.A < 0 ? "neg" : ""}`}>
                  {formatQuantity(row.A)}
                </td>
                <td className={`num ${row.B < 0 ? "neg" : ""}`}>
                  {formatQuantity(row.B)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
