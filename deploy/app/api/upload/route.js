import { promises as fs } from 'fs';
import path from 'path';
import { getSessionFromCookie } from '@/lib/session';

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = getSessionFromCookie(cookieHeader);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Yetkisiz erişim.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'Dosya bulunamadı.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const originalExt = path.extname(file.name) || '.png';
    const filename = `${uniqueSuffix}${originalExt}`;
    
    // Target directory inside public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Save file
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const imageUrl = `/uploads/${filename}`;

    return new Response(JSON.stringify({ success: true, imageUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('File upload error:', error);
    return new Response(JSON.stringify({ error: 'Dosya yükleme hatası.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
