import { getClassUnitTotals, getInvestorOptions } from "@/lib/transactions";
import TransactionWizard from "@/components/TransactionWizard";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const [investors, classTotals] = await Promise.all([
    getInvestorOptions(),
    getClassUnitTotals(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="page-title">New Transaction</h1>
      <TransactionWizard
        investors={investors}
        classTotals={classTotals}
        today={today}
      />
    </div>
  );
}
