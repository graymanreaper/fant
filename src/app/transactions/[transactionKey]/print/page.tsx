import { notFound } from "next/navigation";
import Link from "next/link";
import { getTransaction } from "@/lib/transactions";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function TransactionPrintPage({
  params,
}: {
  params: Promise<{ transactionKey: string }>;
}) {
  const { transactionKey } = await params;
  const tx = await getTransaction(transactionKey);
  if (!tx) notFound();

  const totalQuantity = tx.entries.reduce((sum, e) => sum + e.quantity, 0);

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
      <div className="print-actions">
        <PrintButton />{" "}
        <Link
          href={`/transactions/${encodeURIComponent(tx.transactionKey)}`}
          className="btn no-print"
        >
          Back to Transaction
        </Link>
      </div>

      <div className="card">
        <h1 className="page-title">Ledger History Report</h1>
        <p className="muted">Generated {formatDate(new Date())}</p>

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

        <h2 className="section-title" style={{ marginTop: 18 }}>
          Notes
        </h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{tx.notes ?? ""}</p>

        <h2 className="section-title" style={{ marginTop: 18 }}>
          Ledger Entries
        </h2>
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
                  {entry.investorName}{" "}
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
              <td style={{ textAlign: "right", fontWeight: 700 }}>Net</td>
              <td className={`num ${totalQuantity !== 0 ? "neg" : ""}`}>
                <strong>{formatQuantity(totalQuantity)}</strong>
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
