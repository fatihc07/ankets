export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = getSessionFromCookie(cookieHeader);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Yetkisiz erişim.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();

    // Fetch the single latest submission for this instructor's courses
    const latest = await db.get(`
      SELECT 
        sub.id as submission_id,
        sub.survey_id,
        sub.open_ended_text,
        sub.created_at as submission_time,
        s.title as survey_title,
        c.code as course_code,
        c.name as course_name
      FROM submissions sub
      JOIN surveys s ON sub.survey_id = s.id
      JOIN courses c ON s.course_id = c.id
      WHERE c.instructor_id = ?
      ORDER BY sub.id DESC
      LIMIT 1
    `, [session.id]);

    if (!latest) {
      return new Response(JSON.stringify({ success: true, latestSubmission: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch all answers for this submission
    const answers = await db.all(`
      SELECT 
        a.id as answer_id,
        a.question_id,
        a.rating,
        a.choice_answer,
        cq.question_text,
        cq.question_type
      FROM answers a
      JOIN course_questions cq ON a.question_id = cq.id
      WHERE a.submission_id = ?
      ORDER BY cq.id ASC
    `, [latest.submission_id]);

    // Format timestamp in Turkey Local Time (Europe/Istanbul GMT+3)
    let formattedTime = latest.submission_time;
    if (latest.submission_time) {
      try {
        const d = new Date(latest.submission_time);
        if (!isNaN(d.getTime())) {
          formattedTime = d.toLocaleString('tr-TR', {
            timeZone: 'Europe/Istanbul',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        }
      } catch (e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      latestSubmission: {
        ...latest,
        submission_time: formattedTime,
        answers: answers || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch latest submission error:', error);
    return new Response(JSON.stringify({ error: 'Son katılım bilgisi alınamadı.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
