import { NextResponse } from "next/server";
import { createInvestor } from "@/lib/investors";
import { parseInvestorInput } from "@/lib/parse-investor";

export const runtime = "nodejs";

/** Create a new investor. The sequential InvestorKey is assigned server-side. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseInvestorInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  // A new investor has no ledger entries, so the inactive/units rule is moot.
  const investor = await createInvestor(parsed.value);
  return NextResponse.json(investor, { status: 201 });
}
