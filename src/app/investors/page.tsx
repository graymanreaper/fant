import Link from "next/link";
import { searchInvestors } from "@/lib/investors";

export const dynamic = "force-dynamic";

export default async function InvestorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = await searchInvestors(query);

  return (
    <div>
      <h1 className="page-title">Investors</h1>

      <div className="card">
        <form className="search-bar" method="get">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by legal name or alternative name…"
            aria-label="Search investors"
            autoFocus
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          <Link href="/investors/new" className="btn">
            New Member
          </Link>
        </form>

        <p className="muted">
          {query
            ? `${results.length} match${results.length === 1 ? "" : "es"} for “${query}”.`
            : `Showing all ${results.length} investors.`}
        </p>

        {results.length > 0 ? (
          <table className="grid">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Key</th>
                <th>Legal Name</th>
                <th>Alternative Name</th>
                <th>City</th>
                <th style={{ width: 70 }}>State</th>
                <th style={{ width: 90 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((investor) => (
                <tr key={investor.investorKey}>
                  <td className="num">{investor.investorKey}</td>
                  <td>
                    <Link
                      href={`/investors/${investor.investorKey}`}
                      className="result-link"
                    >
                      {investor.investorName}
                    </Link>
                  </td>
                  <td>{investor.investorAltName ?? ""}</td>
                  <td>{investor.investorCity ?? ""}</td>
                  <td>{investor.investorState ?? ""}</td>
                  <td>
                    <span
                      className={`pill ${
                        investor.inactive ? "pill-inactive" : "pill-active"
                      }`}
                    >
                      {investor.inactive ? "Inactive" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No investors found.</p>
        )}
      </div>
    </div>
  );
}
