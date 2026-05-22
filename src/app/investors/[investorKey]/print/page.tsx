import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCounterparties,
  getInvestor,
  getInvestorLedger,
  getUnitBalance,
} from "@/lib/investors";
import { INVESTOR_FLAGS } from "@/lib/investor-fields";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function InvestorPrintPage({
  params,
}: {
  params: Promise<{ investorKey: string }>;
}) {
  const key = Number((await params).investorKey);
  if (!Number.isInteger(key)) notFound();

  const investor = await getInvestor(key);
  if (!investor) notFound();

  const [ledger, unitBalance] = await Promise.all([
    getInvestorLedger(key),
    getUnitBalance(key),
  ]);

  const ledgerRows = await Promise.all(
    ledger.map(async (entry) => ({
      entry,
      counterParty: await getCounterparties(
        entry.transactionKey,
        entry.ledgerEntryKey,
      ),
    })),
  );

  const flags = INVESTOR_FLAGS.filter((flag) => investor[flag.key]);

  const identity: [string, string][] = [
    ["InvestorKey", String(investor.investorKey)],
    ["Legal Name", investor.investorName],
    ["Alternative Name", investor.investorAltName ?? ""],
    ["Address1", investor.investorAddress1 ?? ""],
    ["City", investor.investorCity ?? ""],
    ["State", investor.investorState ?? ""],
    ["Post Code", investor.investorPostCode ?? ""],
    ["Country", investor.investorCountry ?? ""],
    ["Email", investor.investorEmail ?? ""],
    ["EIN", investor.investorEIN ?? ""],
    ["Phone1", investor.investorPhone1 ?? ""],
    ["Phone2", investor.investorPhone2 ?? ""],
  ];

  return (
    <div>
      <div className="print-actions">
        <PrintButton />{" "}
        <Link href={`/investors/${key}`} className="btn no-print">
          Back to Member
        </Link>
      </div>

      <div className="card">
        <h1 className="page-title">Investor History Report</h1>
        <p className="muted">Generated {formatDate(new Date())}</p>

        <h2 className="section-title">Member</h2>
        <table className="grid" style={{ maxWidth: 520 }}>
          <tbody>
            {identity.map(([label, value]) => (
              <tr key={label}>
                <th style={{ width: 160 }}>{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="section-title" style={{ marginTop: 18 }}>
          Classification
        </h2>
        <p>
          {flags.length > 0
            ? flags.map((flag) => flag.label).join(", ")
            : "None"}
        </p>

        <h2 className="section-title" style={{ marginTop: 18 }}>
          Notes
        </h2>
        <p style={{ whiteSpace: "pre-wrap" }}>
          {investor.investorNotes ?? ""}
        </p>

        <h2 className="section-title" style={{ marginTop: 18 }}>
          Ledger History
        </h2>
        {ledgerRows.length > 0 ? (
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
                <th>Counter Party</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.map(({ entry, counterParty }) => (
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
                  <td>{counterParty}</td>
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
