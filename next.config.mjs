/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Loaded from node_modules at runtime rather than bundled: PGlite must find
  // its WebAssembly and data files, and postgres uses Node's net/tls.
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  outputFileTracingIncludes: {
    // PGlite is only used when no DATABASE_URL is set, and is imported
    // dynamically, so its runtime files have to be traced in explicitly.
    '/**': ['./node_modules/@electric-sql/pglite/dist/**/*'],
  },
};

export default nextConfig;
