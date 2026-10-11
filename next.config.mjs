/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite ships WASM files that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
