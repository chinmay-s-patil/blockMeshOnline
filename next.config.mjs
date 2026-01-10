import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx'],
  
  webpack: (config, { isServer }) => {
    // Add alias to resolve app directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
      '@/app': `${__dirname}/app`,
      '@/components': `${__dirname}/app/components`,
      '@/pages': `${__dirname}/app/pages`,
    };
    
    return config;
  },
};

export default nextConfig;