import { NextResponse } from "next/server";
import { getNextTransactionKey } from "@/lib/transactions";
import { parseDateText } from "@/lib/parse-transaction";

export const runtime = "nodejs";

/** Suggest the next auto TransactionKey for a type and date. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const date = parseDateText(url.searchParams.get("date"));

  if (type !== "sale" && type !== "grant" && type !== "subscription") {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const transactionKey = await getNextTransactionKey(type, date);
  return NextResponse.json({ transactionKey });
}
