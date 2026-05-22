"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TransactionActions({
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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showReverse, setShowReverse] = useState(false);
  const [reversalDate, setReversalDate] = useState(today);

  const encoded = encodeURIComponent(transactionKey);

  async function zeroOut() {
    if (
      !window.confirm(
        "Are you sure you want to delete (zero out) this transaction? " +
          "Every entry will be set to zero and its notes annotated.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/transactions/${encoded}/delete`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        zeroed?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Delete failed.");
        return;
      }
      setInfo(`Transaction zeroed out (${data.zeroed} entries).`);
      router.refresh();
    } catch {
      setError("Network error while deleting.");
    } finally {
      setBusy(false);
    }
  }

  async function reverse() {
    setBusy(true);
    setError(null);
    setInfo(null);
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
        setError(data.error ?? "Reversal failed.");
        return;
      }
      setShowReverse(false);
      router.push(`/transactions/${encodeURIComponent(data.reversalKey!)}`);
    } catch {
      setError("Network error while reversing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {info ? <div className="alert alert-ok">{info}</div> : null}

      <div className="button-row">
        <button
          type="button"
          className="btn"
          disabled={busy || reversed}
          onClick={() => setShowReverse((v) => !v)}
        >
          Reverse Transaction
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={zeroOut}
        >
          Delete (Zero Out)
        </button>
        {reversed ? (
          <span className="muted" style={{ alignSelf: "center" }}>
            This transaction has already been reversed.
          </span>
        ) : null}
      </div>

      {showReverse ? (
        <div className="addrow" style={{ marginTop: 10 }}>
          <span className="addrow-title">Reversal Date</span>
          <input
            type="date"
            value={reversalDate}
            onChange={(e) => setReversalDate(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={reverse}
          >
            Confirm Reversal
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => setShowReverse(false)}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
