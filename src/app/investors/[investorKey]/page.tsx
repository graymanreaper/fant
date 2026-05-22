import { notFound } from "next/navigation";
import {
  getInvestor,
  getInvestorLedger,
  getNextInvestorKey,
  getUnitBalance,
} from "@/lib/investors";
import InvestorForm from "@/components/InvestorForm";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";

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
          <table className="grid">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction Key</th>
                <th>Unit</th>
                <th>Sub</th>
                <th>Amount</th>
                <th>Orig. Iss.</th>
                <th>Quantity</th>
                <th>Reversal Of</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.ledgerEntryKey}>
                  <td>{formatDate(entry.ledgerEntryDate)}</td>
                  <td>{entry.transactionKey}</td>
                  <td>{entry.unitType}</td>
                  <td>{entry.unitSubType}</td>
                  <td className="num">{formatCurrency(entry.amount)}</td>
                  <td>{entry.originalIssuance ? "Yes" : ""}</td>
                  <td className={`num ${entry.quantity < 0 ? "neg" : ""}`}>
                    {formatQuantity(entry.quantity)}
                  </td>
                  <td>{entry.reversalOfTransactionKey ?? ""}</td>
                  <td>{entry.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ textAlign: "right", fontWeight: 700 }}>
                  Unit Balance
                </td>
                <td className={`num ${unitBalance < 0 ? "neg" : ""}`}>
                  <strong>{formatQuantity(unitBalance)}</strong>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="muted">No ledger entries for this investor.</p>
        )}
      </div>
    </div>
  );
}
