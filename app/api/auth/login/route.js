export const dynamic = 'force-dynamic';

import { getDb, hashPassword } from '@/lib/db';
import { encryptSession } from '@/lib/session';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Kullanıcı adı ve şifre gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();
    const instructor = await db.get('SELECT * FROM instructors WHERE username = ?', [username.toLowerCase().trim()]);

    if (!instructor) {
      return new Response(JSON.stringify({ error: 'Kullanıcı adı veya şifre hatalı.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pHash = hashPassword(password);
    if (pHash !== instructor.password_hash) {
      return new Response(JSON.stringify({ error: 'Kullanıcı adı veya şifre hatalı.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionData = {
      id: instructor.id,
      name: instructor.name,
      username: instructor.username
    };

    const token = encryptSession(sessionData);

    return new Response(JSON.stringify({ success: true, instructor: sessionData }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `instructor_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
