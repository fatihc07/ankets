export const dynamic = 'force-dynamic';

import { getDb, hashPassword } from '@/lib/db';
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

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Mevcut şifre ve yeni şifre alanları doldurulmalıdır.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword.length < 3) {
      return new Response(JSON.stringify({ error: 'Yeni şifre en az 3 karakter olmalıdır.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();
    
    // Fetch current instructor details
    const instructor = await db.get('SELECT * FROM instructors WHERE id = ?', [session.id]);
    if (!instructor) {
      return new Response(JSON.stringify({ error: 'Eğitmen bulunamadı.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify current password
    const currentHash = hashPassword(currentPassword);
    if (currentHash !== instructor.password_hash) {
      return new Response(JSON.stringify({ error: 'Mevcut şifre hatalıdır.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash and update to new password
    const newHash = hashPassword(newPassword);
    await db.run('UPDATE instructors SET password_hash = ? WHERE id = ?', [newHash, session.id]);

    return new Response(JSON.stringify({ success: true, message: 'Şifreniz başarıyla güncellendi.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Change password error:', error);
    return new Response(JSON.stringify({ error: 'Şifre güncellenirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
