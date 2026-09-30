/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A second dev server (e.g. a local check) can build elsewhere so it doesn't
  // clobber the main one's .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // content/*.md (the user manual) is imported as a plain string, so it's
  // bundled with the app rather than read from disk at runtime.
  webpack(config) {
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
