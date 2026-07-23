export const dynamic = 'force-dynamic';

import os from 'os';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    let publicUrl = null;
    
    // Automatically detect cloud environment domain (Render / Vercel / Custom domain)
    const host = request?.headers?.get('x-forwarded-host') || request?.headers?.get('host');
    const proto = request?.headers?.get('x-forwarded-proto') || 'https';
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      publicUrl = `${proto}://${host}`;
    }

    // Check if public_url.txt was created by start script
    if (!publicUrl) {
      try {
        const publicUrlPath = path.join(process.cwd(), 'public_url.txt');
        const data = await fs.readFile(publicUrlPath, 'utf8');
        if (data && data.trim()) {
          publicUrl = data.trim();
        }
      } catch (e) {
        // File doesn't exist, ignore
      }
    }

    const interfaces = os.networkInterfaces();
    let localIp = '127.0.0.1';

    // Find the first non-internal IPv4 address
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          // Prefer typical local network ranges
          if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.') || iface.address.startsWith('172.')) {
            localIp = iface.address;
            break;
          }
        }
      }
      if (localIp !== '127.0.0.1') break;
    }

    return new Response(JSON.stringify({ success: true, localIp, publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching network info:', error);
    return new Response(JSON.stringify({ success: true, localIp: '127.0.0.1', publicUrl: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
