"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { InvestorOption } from "@/lib/transactions";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LIST,
  UNIT_SUBTYPES,
  UNIT_TYPES,
  type TransactionTypeId,
} from "@/lib/transaction-types";

interface Line {
  investorKey: number;
  name: string;
  quantity: number;
}

export default function TransactionWizard({
  investors,
  classTotals,
  today,
}: {
  investors: InvestorOption[];
  classTotals: Record<string, number>;
  today: string;
}) {
  const router = useRouter();

  const [typeId, setTypeId] = useState<TransactionTypeId>("sale");
  const def = TRANSACTION_TYPES[typeId];

  const [transactionDate, setTransactionDate] = useState(today);
  const [dateIsEstimate, setDateIsEstimate] = useState(false);
  const [unitType, setUnitType] = useState("");
  const [unitSubType, setUnitSubType] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [keyLocked, setKeyLocked] = useState(false);
  const [notes, setNotes] = useState(TRANSACTION_TYPES.sale.defaultComment);
  const [lines, setLines] = useState<Line[]>([]);

  const [transferorKey, setTransferorKey] = useState("");
  const [transferorQty, setTransferorQty] = useState("");
  const [transfereeKey, setTransfereeKey] = useState("");
  const [transfereeQty, setTransfereeQty] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Auto-generate the transaction key from type + date unless the user locked it.
  useEffect(() => {
    if (keyLocked) return;
    let cancelled = false;
    fetch(`/api/transactions/next-key?type=${typeId}&date=${transactionDate}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.transactionKey) setTransactionKey(d.transactionKey);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [typeId, transactionDate, keyLocked]);

  const transferorOptions = investors.filter((i) =>
    def.transferorTreasuryOnly ? i.treasury : !i.treasury,
  );
  const transfereeOptions =
    def.id === "sale" ? investors : investors.filter((i) => !i.treasury);

  const balance = lines.reduce((sum, l) => sum + l.quantity, 0);
  const balanced = lines.length > 0 && balance === 0;
  const balanceText =
    lines.length === 0
      ? "No transaction lines added yet."
      : balanced
        ? "Transaction is balanced."
        : `Transaction is out of balance by ${balance}.`;

  function changeType(next: TransactionTypeId) {
    setTypeId(next);
    setLines([]);
    setNotes(TRANSACTION_TYPES[next].defaultComment);
    setUnitSubType("");
    setAmount("");
    setTransferorKey("");
    setTransferorQty("");
    setTransfereeKey("");
    setTransfereeQty("");
    setError(null);
  }

  function nameOf(key: number): string {
    return (
      investors.find((i) => i.investorKey === key)?.investorName ?? `#${key}`
    );
  }

  function addLine(key: number, quantity: number) {
    setLines((prev) => [
      ...prev,
      { investorKey: key, name: nameOf(key), quantity },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }

  /** Units of the chosen class already committed to giving lines for an investor. */
  function pendingOutflow(investorKey: number): number {
    return lines
      .filter((l) => l.investorKey === investorKey && l.quantity < 0)
      .reduce((sum, l) => sum - l.quantity, 0);
  }

  function addTransferor() {
    setError(null);
    if (!unitType) {
      setError("Select a unit class before adding a seller.");
      return;
    }
    const key = Number(transferorKey);
    const qty = Number(transferorQty);
    if (!key) {
      setError(`Select a ${def.transferorLabel.toLowerCase()}.`);
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Enter a positive whole quantity.");
      return;
    }
    const held = classTotals[`${key}|${unitType}`] ?? 0;
    if (held - pendingOutflow(key) < qty) {
      setError(
        `${nameOf(key)} does not have enough Class ${unitType} units ` +
          `(holds ${held}).`,
      );
      return;
    }
    addLine(key, -qty);
    setTransferorKey("");
    setTransferorQty("");
  }

  function addTransferee() {
    setError(null);
    const teKey = Number(transfereeKey);
    const qty = Number(transfereeQty);
    if (!teKey) {
      setError(`Select a ${def.transfereeLabel.toLowerCase()}.`);
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Enter a positive whole quantity.");
      return;
    }
    if (!def.separateTransferor) {
      const fromKey = Number(transferorKey);
      if (!fromKey) {
        setError(`Select a ${def.transferorLabel.toLowerCase()}.`);
        return;
      }
      addLine(fromKey, -qty);
      setTransferorKey("");
    }
    addLine(teKey, qty);
    setTransfereeKey("");
    setTransfereeQty("");
  }

  async function post() {
    setError(null);
    if (!balanced) {
      setError("Transaction is not balanced. Check the lines before posting.");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: typeId,
          transactionDate,
          dateIsEstimate,
          unitType,
          unitSubType: def.capturesSubType ? unitSubType : null,
          amount: def.capturesAmount ? Number(amount) : null,
          transactionKey,
          notes,
          lines: lines.map((l) => ({
            investorKey: l.investorKey,
            quantity: l.quantity,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        transactionKey?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Posting failed.");
        return;
      }
      router.push(`/transactions/${encodeURIComponent(data.transactionKey!)}`);
    } catch {
      setError("Network error while posting the transaction.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <h2 className="section-title">Transaction Details</h2>

        <div className="field">
          <label htmlFor="txType">Transaction Type</label>
          <select
            id="txType"
            value={typeId}
            onChange={(e) => changeType(e.target.value as TransactionTypeId)}
          >
            {TRANSACTION_TYPE_LIST.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="txDate">Transaction Date</label>
          <input
            id="txDate"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="txEstimate">Date is Estimate</label>
          <span>
            <input
              id="txEstimate"
              type="checkbox"
              checked={dateIsEstimate}
              onChange={(e) => setDateIsEstimate(e.target.checked)}
            />
          </span>
        </div>

        <div className="field">
          <label htmlFor="txUnit">Unit Class</label>
          <select
            id="txUnit"
            value={unitType}
            onChange={(e) => setUnitType(e.target.value)}
          >
            <option value="">— select —</option>
            {UNIT_TYPES.map((u) => (
              <option key={u} value={u}>
                Class {u}
              </option>
            ))}
          </select>
        </div>

        {def.capturesSubType ? (
          <div className="field">
            <label htmlFor="txSubType">Unit Sub Type</label>
            <select
              id="txSubType"
              value={unitSubType}
              onChange={(e) => setUnitSubType(e.target.value)}
            >
              <option value="">— select —</option>
              {UNIT_SUBTYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {def.capturesAmount ? (
          <div className="field">
            <label htmlFor="txAmount">Purchase Amount</label>
            <input
              id="txAmount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="txKey">Transaction Key</label>
          <input
            id="txKey"
            type="text"
            value={transactionKey}
            onChange={(e) => {
              setTransactionKey(e.target.value);
              setKeyLocked(true);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="txKeyLock">Lock Key</label>
          <span>
            <input
              id="txKeyLock"
              type="checkbox"
              checked={keyLocked}
              onChange={(e) => setKeyLocked(e.target.checked)}
            />{" "}
            <span className="muted">
              {keyLocked
                ? "Manual key — not auto-generated."
                : "Auto-generated from type and date."}
            </span>
          </span>
        </div>

        <div className="notes-block">
          <label htmlFor="txNotes">Notes:</label>
          <textarea
            id="txNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Add Transaction Lines</h2>

        {def.separateTransferor ? (
          <>
            <div className="addrow">
              <span className="addrow-title">{def.transferorLabel}</span>
              <select
                value={transferorKey}
                onChange={(e) => setTransferorKey(e.target.value)}
                aria-label={def.transferorLabel}
              >
                <option value="">— select —</option>
                {transferorOptions.map((i) => (
                  <option key={i.investorKey} value={i.investorKey}>
                    {i.investorName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                placeholder={def.transferorQtyLabel}
                value={transferorQty}
                onChange={(e) => setTransferorQty(e.target.value)}
                aria-label={def.transferorQtyLabel}
              />
              <button type="button" className="btn" onClick={addTransferor}>
                Add {def.transferorLabel}
              </button>
            </div>
            <div className="addrow">
              <span className="addrow-title">{def.transfereeLabel}</span>
              <select
                value={transfereeKey}
                onChange={(e) => setTransfereeKey(e.target.value)}
                aria-label={def.transfereeLabel}
              >
                <option value="">— select —</option>
                {transfereeOptions.map((i) => (
                  <option key={i.investorKey} value={i.investorKey}>
                    {i.investorName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                placeholder={def.transfereeQtyLabel}
                value={transfereeQty}
                onChange={(e) => setTransfereeQty(e.target.value)}
                aria-label={def.transfereeQtyLabel}
              />
              <button type="button" className="btn" onClick={addTransferee}>
                Add {def.transfereeLabel}
              </button>
            </div>
          </>
        ) : (
          <div className="addrow">
            <select
              value={transferorKey}
              onChange={(e) => setTransferorKey(e.target.value)}
              aria-label={def.transferorLabel}
            >
              <option value="">— {def.transferorLabel} —</option>
              {transferorOptions.map((i) => (
                <option key={i.investorKey} value={i.investorKey}>
                  {i.investorName}
                </option>
              ))}
            </select>
            <select
              value={transfereeKey}
              onChange={(e) => setTransfereeKey(e.target.value)}
              aria-label={def.transfereeLabel}
            >
              <option value="">— {def.transfereeLabel} —</option>
              {transfereeOptions.map((i) => (
                <option key={i.investorKey} value={i.investorKey}>
                  {i.investorName}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="1"
              placeholder={def.transfereeQtyLabel}
              value={transfereeQty}
              onChange={(e) => setTransfereeQty(e.target.value)}
              aria-label={def.transfereeQtyLabel}
            />
            <button type="button" className="btn" onClick={addTransferee}>
              Add
            </button>
          </div>
        )}

        {lines.length > 0 ? (
          <table className="grid" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Investor</th>
                <th style={{ width: 140 }}>Quantity</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.investorKey}-${index}`}>
                  <td>
                    {line.name}{" "}
                    <span className="muted">#{line.investorKey}</span>
                  </td>
                  <td className={`num ${line.quantity < 0 ? "neg" : ""}`}>
                    {line.quantity.toLocaleString("en-US")}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => removeLine(index)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <p className={`balance-status ${balanced ? "ok" : "bad"}`}>
          {balanceText}
        </p>
      </div>

      <div className="card">
        <div className="button-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!balanced || posting}
            onClick={post}
          >
            {posting ? "Posting…" : "Post Transaction"}
          </button>
          <Link href="/transactions" className="btn">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
