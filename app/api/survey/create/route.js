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

    const { courseId, title, customQrUrl, activeDate } = await request.json();

    if (!courseId || !title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'Ders seçimi ve anket başlığı gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();

    // Verify course ownership
    const course = await db.get(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, session.id]
    );

    if (!course) {
      return new Response(JSON.stringify({ error: 'Ders bulunamadı veya yetkiniz yok.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.run(
      'INSERT INTO surveys (course_id, title, custom_qr_url, active_date) VALUES (?, ?, ?, ?)',
      [courseId, title.trim(), customQrUrl || null, activeDate || null]
    );

    const surveyId = result.lastID;
    const newSurvey = await db.get('SELECT * FROM surveys WHERE id = ?', [surveyId]);

    return new Response(JSON.stringify({ success: true, survey: newSurvey }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create survey error:', error);
    return new Response(JSON.stringify({ error: 'Anket oluşturulurken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
