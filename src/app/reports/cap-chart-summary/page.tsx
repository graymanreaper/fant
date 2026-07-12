import Link from "next/link";
import { formatQuantity } from "@/lib/format";
import { getCapChartSummary } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function CapChartSummaryPage() {
  const rows = await getCapChartSummary();

  return (
    <div>
      <h1 className="page-title">Cap Chart - Summary</h1>

      <div className="card">
        <div className="button-row" style={{ marginTop: 0 }}>
          <Link href="/reports" className="btn">
            Back to Reports
          </Link>
        </div>
        <table className="grid">
          <thead>
            <tr>
              <th>UnitType</th>
              <th>Status</th>
              <th>SumOfQuan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.unitType}-${row.status}`}>
                <td>{row.unitType}</td>
                <td>{row.status}</td>
                <td className={`num ${row.sumOfQuan < 0 ? "neg" : ""}`}>
                  {formatQuantity(row.sumOfQuan)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
