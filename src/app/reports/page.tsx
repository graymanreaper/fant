import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div>
      <h1 className="page-title">Reports</h1>

      <div className="card">
        <div className="report-button-grid">
          <Link href="/reports/investor-history" className="btn btn-primary">
            Investor History Report
          </Link>
          <Link href="/reports/ledger-history" className="btn">
            Ledger History Report
          </Link>
          <Link href="/reports/cap-chart-summary" className="btn">
            Cap Chart - Summary
          </Link>
          <Link href="/reports/cap-chart-detail" className="btn">
            Cap Chart - Detail
          </Link>
          <Link href="/reports/excel-export" className="btn">
            Excel Export
          </Link>
        </div>
      </div>
    </div>
  );
}
