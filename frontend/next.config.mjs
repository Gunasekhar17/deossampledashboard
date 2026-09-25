/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Section 8: security headers (CSP/HSTS) — start minimal, tighten before
  // go-live once the exact set of external resources (fonts, etc.) is fixed.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
