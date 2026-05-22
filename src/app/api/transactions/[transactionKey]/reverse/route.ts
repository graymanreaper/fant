import { NextResponse } from "next/server";
import { reverseTransaction } from "@/lib/transactions";
import { parseDateText } from "@/lib/parse-transaction";

export const runtime = "nodejs";

/** Create offsetting reversal entries for a transaction. */
export async function POST(
  request: Request,
  context: { params: Promise<{ transactionKey: string }> },
) {
  const { transactionKey } = await context.params;
  const body = await request.json().catch(() => null);
  const reversalDate = parseDateText(
    body && typeof body === "object"
      ? (body as Record<string, unknown>).reversalDate
      : null,
  );
  if (!reversalDate) {
    return NextResponse.json(
      { error: "Enter a valid reversal date." },
      { status: 400 },
    );
  }

  const result = await reverseTransaction(transactionKey, reversalDate);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json(result);
}
