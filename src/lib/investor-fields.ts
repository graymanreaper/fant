// Shared field metadata usable from both server and client components.

/** Boolean flags shown as checkboxes on the Investor form, in display order. */
export const INVESTOR_FLAGS = [
  { key: "treasury", label: "Treasury Stock" },
  { key: "formerOfficer", label: "Former Officer" },
  { key: "founder", label: "Founder" },
  { key: "repettiAffiliate", label: "Repetti Affiliate" },
  { key: "boardOfManagers", label: "Board of Managers" },
  { key: "inactive", label: "Inactive" },
  { key: "officer", label: "Officer" },
] as const;

export type InvestorFlagKey = (typeof INVESTOR_FLAGS)[number]["key"];
