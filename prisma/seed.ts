import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Reset (development data only).
  await prisma.ledgerEntry.deleteMany();
  await prisma.investor.deleteMany();

  await prisma.investor.createMany({
    data: [
      {
        investorKey: 1,
        investorName: "ACME Holdings LLC",
        investorAltName: "ACME",
        investorAddress1: "1 Market Plaza",
        investorCity: "New York",
        investorState: "NY",
        investorPostCode: "10004",
        investorCountry: "USA",
        investorEmail: "treasury@acme-holdings.example",
        investorEIN: "ACMEH001",
        investorPhone1: "212-555-0100",
        investorPhone2: null,
        treasury: true,
        investorNotes: "Treasury account. Holds shares pending sale.",
      },
      {
        investorKey: 2,
        investorName: "Jane Q. Investor",
        investorAltName: null,
        investorAddress1: "88 Riverside Drive",
        investorCity: "Boston",
        investorState: "MA",
        investorPostCode: "02116",
        investorCountry: "USA",
        investorEmail: "jane@example.com",
        investorEIN: "INVST014",
        investorPhone1: "617-555-0142",
        investorPhone2: "617-555-0143",
      },
      {
        investorKey: 3,
        investorName: "Repetti Family Trust",
        investorAltName: "Repetti Trust",
        investorAddress1: "204 Lakeview Road",
        investorCity: "Greenwich",
        investorState: "CT",
        investorPostCode: "06830",
        investorCountry: "USA",
        investorEmail: "trustee@repetti.example",
        investorEIN: "REPET021",
        investorPhone1: "203-555-0188",
        founder: true,
        repettiAffiliate: true,
        investorNotes: "Founding member.",
      },
      {
        investorKey: 4,
        investorName: "John Smith",
        investorAddress1: "12 Hillcrest Avenue",
        investorCity: "Stamford",
        investorState: "CT",
        investorPostCode: "06901",
        investorCountry: "USA",
        investorEmail: "john.smith@example.com",
        investorEIN: "SMITH033",
        investorPhone1: "203-555-0210",
        officer: true,
        boardOfManagers: true,
      },
      {
        investorKey: 5,
        investorName: "Former Holdings Inc",
        investorAltName: null,
        investorAddress1: "500 Old Mill Street",
        investorCity: "Hartford",
        investorState: "CT",
        investorPostCode: "06103",
        investorCountry: "USA",
        investorEmail: null,
        investorEIN: "FORMR007",
        investorPhone1: null,
        formerOfficer: true,
        inactive: true,
        investorNotes: "Fully redeemed; unit balance is zero.",
      },
      {
        investorKey: 6,
        investorName: "Maria Garcia",
        investorAddress1: "77 Sunset Boulevard",
        investorCity: "Miami",
        investorState: "FL",
        investorPostCode: "33101",
        investorCountry: "USA",
        investorEmail: "maria.garcia@example.com",
        investorEIN: "GARCI052",
        investorPhone1: "305-555-0166",
      },
    ],
  });

  await prisma.ledgerEntry.createMany({
    data: [
      // Original issuance into the treasury account (no counterparty).
      {
        ledgerEntryDate: new Date("2024-01-15"),
        investorKey: 1,
        transactionKey: "Sale_2024-01-15-1",
        unitType: "A",
        unitSubType: "1st",
        amount: "0.00",
        originalIssuance: true,
        quantity: 20000,
        notes: "Original issuance of Class A units.",
      },
      // Treasury sells 5,000 units to Jane.
      {
        ledgerEntryDate: new Date("2024-02-01"),
        investorKey: 1,
        transactionKey: "Sale_2024-02-01-1",
        unitType: "A",
        unitSubType: "1st",
        amount: "50000.00",
        quantity: -5000,
        notes: "Sale to Jane Q. Investor.",
      },
      {
        ledgerEntryDate: new Date("2024-02-01"),
        investorKey: 2,
        transactionKey: "Sale_2024-02-01-1",
        unitType: "A",
        unitSubType: "1st",
        amount: "50000.00",
        quantity: 5000,
        notes: "Purchase from treasury.",
      },
      // Treasury sells 3,000 units to the Repetti Family Trust.
      {
        ledgerEntryDate: new Date("2024-03-10"),
        investorKey: 1,
        transactionKey: "Sale_2024-03-10-1",
        unitType: "A",
        unitSubType: "1st",
        amount: "33000.00",
        quantity: -3000,
        notes: "Sale to Repetti Family Trust.",
      },
      {
        ledgerEntryDate: new Date("2024-03-10"),
        investorKey: 3,
        transactionKey: "Sale_2024-03-10-1",
        unitType: "A",
        unitSubType: "1st",
        amount: "33000.00",
        quantity: 3000,
        notes: "Purchase from treasury.",
      },
      // Treasury sells 2,000 Class B units to John Smith.
      {
        ledgerEntryDate: new Date("2024-06-22"),
        investorKey: 1,
        transactionKey: "Sale_2024-06-22-1",
        unitType: "B",
        unitSubType: "2nd",
        amount: "24000.00",
        quantity: -2000,
        notes: "Sale to John Smith.",
      },
      {
        ledgerEntryDate: new Date("2024-06-22"),
        investorKey: 4,
        transactionKey: "Sale_2024-06-22-1",
        unitType: "B",
        unitSubType: "2nd",
        amount: "24000.00",
        quantity: 2000,
        notes: "Purchase from treasury.",
      },
      // Secondary sale: Jane sells 1,000 units to Maria Garcia.
      {
        ledgerEntryDate: new Date("2024-09-05"),
        investorKey: 2,
        transactionKey: "Sale_2024-09-05-1",
        unitType: "A",
        unitSubType: "1st",
        amount: "13000.00",
        quantity: -1000,
        notes: "Secondary sale to Maria Garcia.",
      },
      {
        ledgerEntryDate: new Date("2024-09-05"),
        investorKey: 6,
        transactionKey: "Sale_2024-09-05-1",
        unitType: "A",
        unitSubType: "1st",
        amount: "13000.00",
        quantity: 1000,
        notes: "Purchase from Jane Q. Investor.",
      },
    ],
  });

  const investors = await prisma.investor.count();
  const entries = await prisma.ledgerEntry.count();
  console.log(`Seeded ${investors} investors and ${entries} ledger entries.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
