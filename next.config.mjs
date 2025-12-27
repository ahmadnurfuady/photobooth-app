// next.config.mjs

import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Config lainnya (jika ada)
  // reactStrictMode: true,
};

// Kita hardcode TRUE agar langsung jalan tanpa variabel env
const bundleAnalyzer = withBundleAnalyzer({
  enabled: true,
  openAnalyzer: true,
});

export default bundleAnalyzer(nextConfig);