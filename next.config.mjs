/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for Azure App Service: no symlinks, no
  // runtime npm install required.
  output: "standalone",
  // Lint is run separately via `npm run lint`; don't block production builds.
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@prisma/client", "exceljs"],
};

export default nextConfig;
