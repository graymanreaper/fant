import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getInvestor,
  getInvestorLedger,
  getNextInvestorKey,
  getUnitBalance,
} from "@/lib/investors";
import InvestorForm from "@/components/InvestorForm";
import CompactTransactionActions from "@/components/CompactTransactionActions";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { getTransactionReversalStatus } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ investorKey: string }>;
}) {
  const key = Number((await params).investorKey);
  if (!Number.isInteger(key)) notFound();

  const investor = await getInvestor(key);
  if (!investor) notFound();

  const [ledger, unitBalance, nextKey] = await Promise.all([
    getInvestorLedger(key),
    getUnitBalance(key),
    getNextInvestorKey(),
  ]);
  const reversalStatus = await getTransactionReversalStatus(
    ledger.map((entry) => entry.transactionKey),
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="page-title">
        {investor.investorName}{" "}
        <span className="muted">#{investor.investorKey}</span>
      </h1>

      <InvestorForm
        initial={investor}
        nextKey={nextKey}
        unitBalance={unitBalance}
      />

      <div className="card">
        <h2 className="section-title">Ledger History</h2>
        {ledger.length > 0 ? (
          <>
            <table className="grid ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Key</th>
                  <th>Class</th>
                  <th>Class Sub</th>
                  <th>Amount</th>
                  <th>Orig. Iss.</th>
                  <th>Quantity</th>
                  <th>Reversal Of</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.ledgerEntryKey}>
                    <td>{formatDate(entry.ledgerEntryDate)}</td>
                    <td>
                      <Link
                        href={`/transactions/${encodeURIComponent(
                          entry.transactionKey,
                        )}`}
                      >
                        {entry.transactionKey}
                      </Link>
                    </td>
                    <td>{entry.unitType}</td>
                    <td>{entry.unitSubType}</td>
                    <td className="num">{formatCurrency(entry.amount)}</td>
                    <td>{entry.originalIssuance ? "Yes" : ""}</td>
                    <td className={`num ${entry.quantity < 0 ? "neg" : ""}`}>
                      {formatQuantity(entry.quantity)}
                    </td>
                    <td>{entry.reversalOfTransactionKey ?? ""}</td>
                    <td>{entry.notes ?? ""}</td>
                    <td>
                      <CompactTransactionActions
                        transactionKey={entry.transactionKey}
                        reversed={reversalStatus.get(entry.transactionKey) ?? false}
                        today={today}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-total">
              <span>Unit Balance</span>
              <strong className={unitBalance < 0 ? "neg" : ""}>
                {formatQuantity(unitBalance)}
              </strong>
            </div>
          </>
        ) : (
          <p className="muted">No ledger entries for this investor.</p>
        )}
      </div>
    </div>
  );
}
