/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A second dev server (e.g. a local check) can build elsewhere so it doesn't
  // clobber the main one's .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
