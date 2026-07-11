import type { InvestorInput } from "@/lib/investors";

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1;
}

export type ParseResult =
  | { ok: true; value: InvestorInput }
  | { ok: false; error: string };

/** Validate and normalize an Investor form submission. */
export function parseInvestorInput(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  const investorName = str(b.investorName);
  if (!investorName) {
    return { ok: false, error: "Legal Name is required." };
  }

  const state = str(b.investorState);
  if (state && state.length > 100) {
    return { ok: false, error: "State is too long (max 100 characters)." };
  }

  return {
    ok: true,
    value: {
      investorName,
      investorAltName: str(b.investorAltName),
      investorAddress1: str(b.investorAddress1),
      investorCity: str(b.investorCity),
      investorState: state,
      investorPostCode: str(b.investorPostCode),
      investorCountry: str(b.investorCountry),
      investorEmail: str(b.investorEmail),
      investorEIN: str(b.investorEIN),
      investorPhone1: str(b.investorPhone1),
      investorPhone2: str(b.investorPhone2),
      treasury: bool(b.treasury),
      founder: bool(b.founder),
      boardOfManagers: bool(b.boardOfManagers),
      officer: bool(b.officer),
      formerOfficer: bool(b.formerOfficer),
      repettiAffiliate: bool(b.repettiAffiliate),
      inactive: bool(b.inactive),
      investorNotes: str(b.investorNotes),
    },
  };
}
