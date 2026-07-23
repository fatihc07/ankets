import { getDb } from '@/lib/db';
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

    const { surveyId, title } = await request.json();

    if (!surveyId || !title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'Geçersiz parametreler. Anket ID ve yeni başlık gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();

    // Verify ownership
    const survey = await db.get(`
      SELECT s.id 
      FROM surveys s 
      JOIN courses c ON s.course_id = c.id 
      WHERE s.id = ? AND c.instructor_id = ?
    `, [surveyId, session.id]);

    if (!survey) {
      return new Response(JSON.stringify({ error: 'Anket bulunamadı veya yetkiniz yok.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.run('UPDATE surveys SET title = ? WHERE id = ?', [title.trim(), surveyId]);

    return new Response(JSON.stringify({ success: true, message: 'Oturum adı başarıyla güncellendi.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update survey title error:', error);
    return new Response(JSON.stringify({ error: 'Oturum adı güncellenirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
