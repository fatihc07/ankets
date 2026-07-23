import os from 'os';

const getNetworkDevOrigins = () => {
  const origins = ['localhost:3000', 'localhost:3001', 'localhost:3002', '127.0.0.1:3000'];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          origins.push(iface.address);
          origins.push(`${iface.address}:3000`);
          origins.push(`${iface.address}:3001`);
        }
      }
    }
  } catch (e) {}
  return origins;
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  allowedDevOrigins: [
    ...getNetworkDevOrigins(),
    '*.serveo.net',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.loca.lt'
  ]
};

export default nextConfig;
