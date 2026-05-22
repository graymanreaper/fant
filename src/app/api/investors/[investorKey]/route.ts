import { NextResponse } from "next/server";
import { getInvestor, getUnitBalance, updateInvestor } from "@/lib/investors";
import { parseInvestorInput } from "@/lib/parse-investor";

export const runtime = "nodejs";

type Context = { params: Promise<{ investorKey: string }> };

async function resolveKey(context: Context): Promise<number | null> {
  const key = Number((await context.params).investorKey);
  return Number.isInteger(key) ? key : null;
}

export async function GET(_request: Request, context: Context) {
  const key = await resolveKey(context);
  if (key === null) {
    return NextResponse.json({ error: "Invalid investor key." }, { status: 400 });
  }
  const investor = await getInvestor(key);
  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }
  return NextResponse.json(investor);
}

/** Update an investor, enforcing the Access "InactiveCheck" rule. */
export async function PUT(request: Request, context: Context) {
  const key = await resolveKey(context);
  if (key === null) {
    return NextResponse.json({ error: "Invalid investor key." }, { status: 400 });
  }
  const existing = await getInvestor(key);
  if (!existing) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseInvestorInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Cannot mark a member inactive while their unit balance is non-zero.
  if (parsed.value.inactive && !existing.inactive) {
    const balance = await getUnitBalance(key);
    if (balance !== 0) {
      return NextResponse.json(
        {
          error: `Units are not currently zero (balance: ${balance}). Cannot make member inactive.`,
        },
        { status: 409 },
      );
    }
  }

  const investor = await updateInvestor(key, parsed.value);
  return NextResponse.json(investor);
}
