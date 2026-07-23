export const dynamic = 'force-dynamic';

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

    const { surveyId } = await request.json();

    if (!surveyId) {
      return new Response(JSON.stringify({ error: 'Geçersiz oturum ID.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();

    // Verify instructor ownership of the survey
    const survey = await db.get(`
      SELECT s.id, s.title
      FROM surveys s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ? AND c.instructor_id = ?
    `, [surveyId, session.id]);

    if (!survey) {
      return new Response(JSON.stringify({ error: 'Oturum bulunamadı veya yetkiniz yok.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete all answers associated with submissions of this survey
    await db.run(`
      DELETE FROM answers
      WHERE submission_id IN (
        SELECT id FROM submissions WHERE survey_id = ?
      )
    `, [surveyId]);

    // Delete all submissions for this survey
    await db.run('DELETE FROM submissions WHERE survey_id = ?', [surveyId]);

    return new Response(JSON.stringify({
      success: true,
      message: `"${survey.title}" oturumuna ait tüm cevaplar ve istatistikler başarıyla sıfırlandı.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error resetting survey:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
