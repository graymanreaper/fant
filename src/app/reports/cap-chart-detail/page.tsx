import Link from "next/link";
import { formatQuantity } from "@/lib/format";
import { getCapChartDetail } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function CapChartDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ through?: string }>;
}) {
  const { through } = await searchParams;
  const throughDate = through && /^\d{4}-\d{2}-\d{2}$/.test(through) ? through : "";
  const rows = throughDate ? await getCapChartDetail(throughDate) : [];

  return (
    <div>
      <h1 className="page-title">Cap Chart - Detail</h1>

      <div className="card">
        <form className="search-bar" method="get">
          <input
            type="date"
            name="through"
            defaultValue={throughDate}
            aria-label="Cap chart through date"
          />
          <button type="submit" className="btn btn-primary">
            Open Detail
          </button>
          <Link href="/reports" className="btn">
            Back to Reports
          </Link>
        </form>

        {throughDate ? (
          <table className="grid ledger-table">
            <thead>
              <tr>
                <th>Treasury</th>
                <th>InvestorName</th>
                <th>InvestorAltName</th>
                <th>Affiliate</th>
                <th>Founder</th>
                <th>BoardOfManagers</th>
                <th>Officer</th>
                <th>FormerOfficer</th>
                <th>A</th>
                <th>B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.investorName}-${row.investorAltName}`}>
                  <td className="num">{row.treasury}</td>
                  <td>{row.investorName}</td>
                  <td>{row.investorAltName}</td>
                  <td className="num">{row.affiliate}</td>
                  <td className="num">{row.founder}</td>
                  <td className="num">{row.boardOfManagers}</td>
                  <td className="num">{row.officer}</td>
                  <td className="num">{row.formerOfficer}</td>
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
        ) : (
          <p className="muted">Select a through date to open the detail.</p>
        )}
      </div>
    </div>
  );
}
