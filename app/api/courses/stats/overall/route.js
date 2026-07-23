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

    // Fetch all courses for the instructor
    const courses = await db.all(
      'SELECT id, name, code, archived, created_at FROM courses WHERE instructor_id = ? ORDER BY created_at DESC',
      [session.id]
    );

    let totalPreCount = 0;
    let totalPostCount = 0;
    const coursesStats = [];

    for (const c of courses) {
      // Get survey ids (using chronological order to define pre and post surveys)
      const surveys = await db.all('SELECT id, title FROM surveys WHERE course_id = ? ORDER BY id ASC', [c.id]);
      
      let preSurvey = null;
      let postSurvey = null;

      if (surveys.length === 1) {
        postSurvey = surveys[0];
      } else if (surveys.length > 1) {
        preSurvey = surveys[0];
        postSurvey = surveys[surveys.length - 1];
      }

      let preCount = 0;
      let postCount = 0;
      let preAvg = 0;
      let postAvg = 0;

      if (preSurvey) {
        const countRes = await db.get('SELECT COUNT(*) as count FROM submissions WHERE survey_id = ?', [preSurvey.id]);
        preCount = countRes.count || 0;
        totalPreCount += preCount;

        if (preCount > 0) {
          const avgRes = await db.get(`
            SELECT AVG(a.rating) as avg_rating 
            FROM answers a
            JOIN submissions s ON a.submission_id = s.id
            WHERE s.survey_id = ?
          `, [preSurvey.id]);
          preAvg = avgRes.avg_rating || 0;
        }
      }

      if (postSurvey) {
        const countRes = await db.get('SELECT COUNT(*) as count FROM submissions WHERE survey_id = ?', [postSurvey.id]);
        postCount = countRes.count || 0;
        totalPostCount += postCount;

        if (postCount > 0) {
          const avgRes = await db.get(`
            SELECT AVG(a.rating) as avg_rating 
            FROM answers a
            JOIN submissions s ON a.submission_id = s.id
            WHERE s.survey_id = ?
          `, [postSurvey.id]);
          postAvg = avgRes.avg_rating || 0;
        }
      }

      coursesStats.push({
        id: c.id,
        name: c.name,
        code: c.code,
        archived: c.archived,
        created_at: c.created_at,
        preCount,
        postCount,
        preAvg: parseFloat(preAvg.toFixed(2)),
        postAvg: parseFloat(postAvg.toFixed(2)),
        shift: parseFloat((postAvg - preAvg).toFixed(2))
      });
    }

    return new Response(JSON.stringify({
      success: true,
      totalCourses: courses.length,
      totalPreCount,
      totalPostCount,
      coursesStats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch overall stats error:', error);
    return new Response(JSON.stringify({ error: 'Genel istatistikler yüklenirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
