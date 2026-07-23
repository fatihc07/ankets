export const dynamic = 'force-dynamic';

import { getDb, hashPassword } from '@/lib/db';

export async function POST(request) {
  try {
    const { name, username, password } = await request.json();

    if (!name || !username || !password) {
      return new Response(JSON.stringify({ error: 'Tüm alanlar gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();
    
    // Check if username already exists
    const existing = await db.get('SELECT id FROM instructors WHERE username = ?', [username.toLowerCase().trim()]);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Bu kullanıcı adı zaten alınmış.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pHash = hashPassword(password);
    await db.run(
      'INSERT INTO instructors (name, username, password_hash) VALUES (?, ?, ?)',
      [name.trim(), username.toLowerCase().trim(), pHash]
    );

    return new Response(JSON.stringify({ success: true, message: 'Kayıt başarılı.' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
