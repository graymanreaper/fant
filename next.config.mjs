/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lint is run separately via `npm run lint`; don't block production builds.
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@prisma/client", "exceljs"],
};

export default nextConfig;
