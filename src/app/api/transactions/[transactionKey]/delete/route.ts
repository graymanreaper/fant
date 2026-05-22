import { NextResponse } from "next/server";
import { getTransaction, zeroOutTransaction } from "@/lib/transactions";

export const runtime = "nodejs";

/** Soft-delete: zero out every entry of a transaction and annotate its notes. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ transactionKey: string }> },
) {
  const { transactionKey } = await context.params;

  const existing = await getTransaction(transactionKey);
  if (!existing) {
    return NextResponse.json(
      { error: "Transaction not found." },
      { status: 404 },
    );
  }

  const count = await zeroOutTransaction(transactionKey);
  return NextResponse.json({ ok: true, zeroed: count });
}
