import { notFound } from "next/navigation";
import Link from "next/link";
import { getTransaction } from "@/lib/transactions";
import TransactionActions from "@/components/TransactionActions";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionKey: string }>;
}) {
  const { transactionKey } = await params;
  const tx = await getTransaction(transactionKey);
  if (!tx) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const totalQuantity = tx.entries.reduce((sum, e) => sum + e.quantity, 0);
  const reversedOf = tx.entries.find((e) => e.reversalOfTransactionKey)
    ?.reversalOfTransactionKey;

  const meta: [string, string][] = [
    ["Transaction Key", tx.transactionKey],
    ["Type", tx.type],
    ["Date", formatDate(tx.date)],
    ["Unit Class", tx.unitType],
    ["Unit Sub Type", tx.unitSubType ?? "—"],
    ["Amount", tx.amount === null ? "—" : formatCurrency(tx.amount)],
  ];

  return (
    <div>
      <h1 className="page-title">{tx.transactionKey}</h1>

      <div className="card">
        <h2 className="section-title">Transaction</h2>
        <table className="grid" style={{ maxWidth: 480 }}>
          <tbody>
            {meta.map(([label, value]) => (
              <tr key={label}>
                <th style={{ width: 150 }}>{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {tx.isReversal && reversedOf ? (
          <p className="balance">
            This is a reversal of{" "}
            <Link href={`/transactions/${encodeURIComponent(reversedOf)}`}>
              {reversedOf}
            </Link>
            .
          </p>
        ) : null}
        {tx.reversed && !tx.isReversal ? (
          <p className="balance">
            Reversed by{" "}
            <Link
              href={`/transactions/${encodeURIComponent(
                `${tx.transactionKey}_REV`,
              )}`}
            >
              {tx.transactionKey}_REV
            </Link>
            .
          </p>
        ) : null}

        <div className="notes-block">
          <label>Notes:</label>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{tx.notes ?? ""}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Ledger Entries</h2>
        <table className="grid">
          <thead>
            <tr>
              <th>Investor</th>
              <th style={{ width: 110 }}>Quantity</th>
              <th style={{ width: 120 }}>Amount</th>
              <th style={{ width: 90 }}>Orig. Iss.</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {tx.entries.map((entry) => (
              <tr key={entry.ledgerEntryKey}>
                <td>
                  <Link href={`/investors/${entry.investorKey}`}>
                    {entry.investorName}
                  </Link>{" "}
                  <span className="muted">#{entry.investorKey}</span>
                </td>
                <td className={`num ${entry.quantity < 0 ? "neg" : ""}`}>
                  {formatQuantity(entry.quantity)}
                </td>
                <td className="num">
                  {entry.amount === null ? "" : formatCurrency(entry.amount)}
                </td>
                <td>{entry.originalIssuance ? "Yes" : ""}</td>
                <td>{entry.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                Net (should be 0)
              </td>
              <td className={`num ${totalQuantity !== 0 ? "neg" : ""}`}>
                <strong>{formatQuantity(totalQuantity)}</strong>
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <h2 className="section-title">Actions</h2>
        <div className="button-row" style={{ marginTop: 0, marginBottom: 12 }}>
          <Link
            href={`/transactions/${encodeURIComponent(
              tx.transactionKey,
            )}/print`}
            className="btn"
            target="_blank"
          >
            Open Ledger Report
          </Link>
          <Link href="/transactions" className="btn">
            Back to Transactions
          </Link>
        </div>
        <TransactionActions
          transactionKey={tx.transactionKey}
          reversed={tx.reversed}
          today={today}
        />
      </div>
    </div>
  );
}
