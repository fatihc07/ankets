export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    
    // Fetch only active (non-archived) courses with their instructor's name
    const courses = await db.all(`
      SELECT c.id, c.name, c.code, i.name as instructor_name, c.created_at
      FROM courses c
      JOIN instructors i ON c.instructor_id = i.id
      WHERE c.archived = 0
      ORDER BY c.created_at DESC
    `);

    // Fetch active surveys for these courses
    const activeSurveys = await db.all(`
      SELECT id, course_id, title, active_date
      FROM surveys
      WHERE active_date IS NOT NULL AND active_date != ''
    `);

    return new Response(JSON.stringify({ success: true, courses, activeSurveys }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch public courses error:', error);
    return new Response(JSON.stringify({ error: 'Genel oturumlar listelenirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
