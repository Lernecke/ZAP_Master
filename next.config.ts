import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ybzdibifgqjsbohtztmy.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
