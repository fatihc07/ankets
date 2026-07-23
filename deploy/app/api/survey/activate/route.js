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

    const { surveyId, activeDate } = await request.json();

    if (!surveyId) {
      return new Response(JSON.stringify({ error: 'Anket ID gereklidir.' }), {
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

    // Set active_date (could be a string, or NULL to deactivate)
    const dbValue = activeDate && activeDate.trim() ? activeDate.trim() : null;

    await db.run(
      'UPDATE surveys SET active_date = ? WHERE id = ?',
      [dbValue, surveyId]
    );

    return new Response(JSON.stringify({ 
      success: true, 
      message: dbValue ? `Anket '${dbValue}' tarihi için aktif edildi.` : 'Anket kapatıldı.',
      active_date: dbValue
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Activate survey error:', error);
    return new Response(JSON.stringify({ error: 'İşlem sırasında hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
