/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    // The seeded database is read at request time, so it has to be traced into
    // the serverless bundle rather than left behind as an unreferenced file.
    '/**': ['./data/fleet-marketplace.db'],
  },
};

export default nextConfig;
