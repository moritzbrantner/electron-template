import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['http://127.0.0.1:3005', 'http://localhost:3005', 'http://127.0.0.1', 'http://localhost', '127.0.0.1', 'localhost'],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
