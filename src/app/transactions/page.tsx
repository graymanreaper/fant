import Link from "next/link";
import { listTransactions } from "@/lib/transactions";
import { formatDate, formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const transactions = await listTransactions(query);

  return (
    <div>
      <h1 className="page-title">Transactions</h1>

      <div className="card">
        <form className="search-bar" method="get">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by transaction key…"
            aria-label="Search transactions"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          <Link href="/transactions/new" className="btn">
            New Transaction
          </Link>
        </form>

        <p className="muted">
          {query
            ? `${transactions.length} match${
                transactions.length === 1 ? "" : "es"
              } for “${query}”.`
            : `Showing all ${transactions.length} transactions.`}
        </p>

        {transactions.length > 0 ? (
          <table className="grid">
            <thead>
              <tr>
                <th>Transaction Key</th>
                <th style={{ width: 110 }}>Date</th>
                <th style={{ width: 100 }}>Type</th>
                <th style={{ width: 70 }}>Class</th>
                <th style={{ width: 80 }}>Entries</th>
                <th style={{ width: 110 }}>Units Moved</th>
                <th style={{ width: 90 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.transactionKey}>
                  <td>
                    <Link
                      href={`/transactions/${encodeURIComponent(
                        tx.transactionKey,
                      )}`}
                      className="result-link"
                    >
                      {tx.transactionKey}
                    </Link>
                  </td>
                  <td>{formatDate(tx.date)}</td>
                  <td>{tx.type}</td>
                  <td>{tx.unitType}</td>
                  <td className="num">{tx.entryCount}</td>
                  <td className="num">{formatQuantity(tx.unitsMoved)}</td>
                  <td>
                    {tx.reversed ? (
                      <span className="pill pill-inactive">Reversed</span>
                    ) : (
                      <span className="pill pill-active">Posted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No transactions found.</p>
        )}
      </div>
    </div>
  );
}
