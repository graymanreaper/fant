"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompactTransactionActions({
  transactionKey,
  reversed,
  today,
}: {
  transactionKey: string;
  reversed: boolean;
  today: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showReverse, setShowReverse] = useState(false);
  const [reversalDate, setReversalDate] = useState(today);
  const [message, setMessage] = useState<string | null>(null);
  const encoded = encodeURIComponent(transactionKey);

  async function zeroOut() {
    if (!window.confirm(`Delete (zero out) transaction ${transactionKey}?`)) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/transactions/${encoded}/delete`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Delete failed.");
        return;
      }
      setMessage("Deleted.");
      router.refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function reverse() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/transactions/${encoded}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reversalDate }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reversalKey?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Reverse failed.");
        return;
      }
      setShowReverse(false);
      router.push(`/transactions/${encodeURIComponent(data.reversalKey!)}`);
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row-actions">
      <button
        type="button"
        className="btn btn-compact"
        disabled={busy || reversed}
        onClick={() => setShowReverse((v) => !v)}
      >
        Reverse
      </button>
      <button
        type="button"
        className="btn btn-compact"
        disabled={busy}
        onClick={zeroOut}
      >
        Delete
      </button>
      {showReverse ? (
        <div className="row-actions-reverse">
          <input
            type="date"
            value={reversalDate}
            onChange={(e) => setReversalDate(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-compact btn-primary"
            disabled={busy}
            onClick={reverse}
          >
            Confirm
          </button>
        </div>
      ) : null}
      {message ? <span className="row-actions-message">{message}</span> : null}
      {reversed ? <span className="muted">Reversed</span> : null}
    </div>
  );
}
