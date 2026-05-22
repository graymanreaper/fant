import { NextResponse } from "next/server";
import { postTransaction } from "@/lib/transactions";
import { parsePostTransaction } from "@/lib/parse-transaction";

export const runtime = "nodejs";

/** Post a new balanced transaction from the ledger entry wizard. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parsePostTransaction(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await postTransaction(parsed.value);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json(result, { status: 201 });
}
