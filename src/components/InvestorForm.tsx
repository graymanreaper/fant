"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { InvestorDTO } from "@/lib/investors";
import { INVESTOR_FLAGS, type InvestorFlagKey } from "@/lib/investor-fields";

type TextFieldName =
  | "investorName"
  | "investorAltName"
  | "investorAddress1"
  | "investorCity"
  | "investorState"
  | "investorPostCode"
  | "investorCountry"
  | "investorEmail"
  | "investorEIN"
  | "investorPhone1"
  | "investorPhone2";

const TEXT_FIELDS: {
  name: TextFieldName;
  label: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
}[] = [
  { name: "investorName", label: "Legal Name", required: true },
  { name: "investorAltName", label: "Alternative Name" },
  { name: "investorAddress1", label: "Address1" },
  { name: "investorCity", label: "City" },
  { name: "investorState", label: "State", maxLength: 100 },
  { name: "investorPostCode", label: "Post Code" },
  { name: "investorCountry", label: "Country" },
  { name: "investorEmail", label: "Email", type: "email" },
  { name: "investorEIN", label: "EIN", placeholder: "xxxxx###" },
  { name: "investorPhone1", label: "Phone1" },
  { name: "investorPhone2", label: "Phone2" },
];

type FormState = Record<TextFieldName, string> &
  Record<InvestorFlagKey, boolean> & { investorNotes: string };

function buildInitialState(initial: InvestorDTO | null): FormState {
  const t = (v: string | null | undefined) => v ?? "";
  return {
    investorName: t(initial?.investorName),
    investorAltName: t(initial?.investorAltName),
    investorAddress1: t(initial?.investorAddress1),
    investorCity: t(initial?.investorCity),
    investorState: t(initial?.investorState),
    investorPostCode: t(initial?.investorPostCode),
    investorCountry: t(initial?.investorCountry),
    investorEmail: t(initial?.investorEmail),
    investorEIN: t(initial?.investorEIN),
    investorPhone1: t(initial?.investorPhone1),
    investorPhone2: t(initial?.investorPhone2),
    treasury: initial?.treasury ?? false,
    founder: initial?.founder ?? false,
    boardOfManagers: initial?.boardOfManagers ?? false,
    officer: initial?.officer ?? false,
    formerOfficer: initial?.formerOfficer ?? false,
    repettiAffiliate: initial?.repettiAffiliate ?? false,
    inactive: initial?.inactive ?? false,
    investorNotes: t(initial?.investorNotes),
  };
}

export default function InvestorForm({
  initial,
  nextKey,
  unitBalance,
}: {
  initial: InvestorDTO | null;
  nextKey: number;
  unitBalance: number;
}) {
  const router = useRouter();
  const isNew = initial === null;
  const [form, setForm] = useState<FormState>(() => buildInitialState(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Access "InactiveCheck": a member with a non-zero unit balance cannot be
  // marked inactive. Allow unchecking an already-inactive member.
  const inactiveLocked = !form.inactive && unitBalance !== 0;

  function setText(name: TextFieldName | "investorNotes", value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function setFlag(name: InvestorFlagKey, value: boolean) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setOk(null);
    setSaving(true);
    try {
      const res = await fetch(
        isNew ? "/api/investors" : `/api/investors/${initial.investorKey}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        investorKey?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      if (isNew && data.investorKey) {
        router.push(`/investors/${data.investorKey}`);
        return;
      }
      setOk("Investor saved.");
      router.refresh();
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  const investorKey = initial?.investorKey;

  return (
    <form className="card" onSubmit={handleSubmit}>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {ok ? <div className="alert alert-ok">{ok}</div> : null}

      <div className="investor-grid">
        {/* Left: identity fields */}
        <div>
          <div className="field">
            <label>InvestorKey</label>
            <span className="readonly">
              {isNew ? `${nextKey} (new — assigned on save)` : investorKey}
            </span>
          </div>

          {TEXT_FIELDS.map((field) => (
            <div className="field" key={field.name}>
              <label htmlFor={field.name}>
                {field.label}
                {field.required ? " *" : ""}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type ?? "text"}
                value={form[field.name]}
                required={field.required}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                onChange={(e) => setText(field.name, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Right: classification checkboxes */}
        <div className="checkbox-panel">
          <h3>Classification</h3>
          {INVESTOR_FLAGS.map((flag) => {
            const locked = flag.key === "inactive" && inactiveLocked;
            return (
              <div className="checkbox-row" key={flag.key}>
                <input
                  id={`flag-${flag.key}`}
                  type="checkbox"
                  checked={form[flag.key]}
                  disabled={locked}
                  onChange={(e) => setFlag(flag.key, e.target.checked)}
                />
                <label htmlFor={`flag-${flag.key}`}>{flag.label}</label>
              </div>
            );
          })}
          {inactiveLocked ? (
            <p className="balance">
              Cannot mark inactive: unit balance is{" "}
              <strong>{unitBalance.toLocaleString("en-US")}</strong>.
            </p>
          ) : null}
        </div>
      </div>

      {/* Notes */}
      <div className="notes-block">
        <label htmlFor="investorNotes">Notes:</label>
        <textarea
          id="investorNotes"
          name="investorNotes"
          value={form.investorNotes}
          onChange={(e) => setText("investorNotes", e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="button-row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : isNew ? "Create Member" : "Save"}
        </button>

        {!isNew && investorKey !== undefined ? (
          <>
            <Link
              href={`/investors/${investorKey}/print`}
              className="btn"
              target="_blank"
            >
              Print Member
            </Link>
            <a
              href={`/api/investors/${investorKey}/export`}
              className="btn"
            >
              Excel Member
            </a>
          </>
        ) : (
          <>
            <button type="button" className="btn" disabled>
              Print Member
            </button>
            <button type="button" className="btn" disabled>
              Excel Member
            </button>
          </>
        )}

        <span className="spacer" style={{ flex: 1 }} />
        <Link href="/investors/new" className="btn">
          New Member
        </Link>
        <Link href="/investors" className="btn">
          Search
        </Link>
      </div>
    </form>
  );
}
