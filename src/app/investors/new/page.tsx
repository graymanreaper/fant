import { getNextInvestorKey } from "@/lib/investors";
import InvestorForm from "@/components/InvestorForm";

export const dynamic = "force-dynamic";

export default async function NewInvestorPage() {
  const nextKey = await getNextInvestorKey();

  return (
    <div>
      <h1 className="page-title">New Member</h1>
      <InvestorForm initial={null} nextKey={nextKey} unitBalance={0} />
    </div>
  );
}
