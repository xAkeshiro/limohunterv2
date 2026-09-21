/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The WASM SQLite driver must not be bundled, so it can locate its .wasm file.
  serverExternalPackages: ['node-sqlite3-wasm'],
  outputFileTracingIncludes: {
    // Both the seeded database and the WASM binary are read at request time,
    // so they have to be traced in rather than left behind as unreferenced files.
    '/**': [
      './data/fleet-marketplace.db',
      './node_modules/node-sqlite3-wasm/dist/*.wasm',
    ],
  },
};

export default nextConfig;
