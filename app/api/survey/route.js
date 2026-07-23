import { getDb } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let surveyId = searchParams.get('surveyId');
    const courseId = searchParams.get('courseId');

    const db = await getDb();

    if (!surveyId && courseId) {
      const activeSurvey = await db.get(`
        SELECT id FROM surveys
        WHERE course_id = ? AND active_date IS NOT NULL
        ORDER BY id DESC LIMIT 1
      `, [courseId]);

      if (!activeSurvey) {
        const course = await db.get('SELECT name, code FROM courses WHERE id = ?', [courseId]);
        const courseName = course ? `${course.code} - ${course.name}` : 'Bu Etkinlik';
        return new Response(JSON.stringify({
          error: `📍 "${courseName}" için bugün henüz aktif bir günlük oturum başlatılmamıştır. Lütfen stant görevlisine danışın.`
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      surveyId = activeSurvey.id;
    }

    if (!surveyId) {
      return new Response(JSON.stringify({ error: 'Geçersiz parametreler.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Fetch course, instructor and survey info by surveyId
    const info = await db.get(`
      SELECT c.id as course_id, c.name as course_name, c.code as course_code, i.name as instructor_name, 
             s.id as survey_id, s.title as survey_title, s.active_date, c.archived
      FROM surveys s
      JOIN courses c ON s.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE s.id = ?
    `, [surveyId]);

    if (!info) {
      return new Response(JSON.stringify({ error: 'Oturum bulunamadı.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isTestMode = searchParams.get('test') === '1' || searchParams.get('reset') === '1';
    const cookieHeader = request.headers.get('cookie') || '';
    if (!isTestMode && info.active_date && cookieHeader.includes(`survey_submitted_${surveyId}_${info.active_date}=true`)) {
      return new Response(JSON.stringify({ success: true, alreadySubmitted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }



    if (info.archived === 1) {
      return new Response(JSON.stringify({ error: 'Bu oturum arşive kaldırıldığı için artık yeni katılım kabul etmemektedir.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch questions for this course
    const questions = await db.all(
      'SELECT id, question_text, question_type, image_url, options FROM course_questions WHERE course_id = ? ORDER BY id ASC',
      [info.course_id]
    );

    // Parse options strings to JS Arrays
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null
    }));

    return new Response(JSON.stringify({ success: true, ...info, questions: parsedQuestions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Survey details error:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const {
      surveyId,
      answers, // Array of { questionId, rating, choiceAnswer }
      openEndedText
    } = await request.json();

    if (!surveyId || !answers || !Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: 'Tüm zorunlu alanlar doldurulmalıdır.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();
    
    // Check if survey and its course are archived and active
    const survey = await db.get(`
      SELECT s.id, s.active_date, c.archived 
      FROM surveys s 
      JOIN courses c ON s.course_id = c.id 
      WHERE s.id = ?
    `, [surveyId]);

    if (!survey) {
      return new Response(JSON.stringify({ error: 'Oturum bulunamadı.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cookieHeader = request.headers.get('cookie') || '';
    if (survey.active_date && cookieHeader.includes(`survey_submitted_${surveyId}_${survey.active_date}=true`)) {
      return new Response(JSON.stringify({ error: 'Bu cihazdan bu oturum günü için zaten katılım sağlanmış.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (survey.archived === 1) {
      return new Response(JSON.stringify({ error: 'Bu genel oturum arşivlendiği için katılım devre dışıdır.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!survey.active_date) {
      return new Response(JSON.stringify({ error: 'Bu oturum şu an aktif değildir. Katılım kabul edilmemektedir.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Insert submission with session_date
      const subResult = await db.run(
        'INSERT INTO submissions (survey_id, session_date, open_ended_text) VALUES (?, ?, ?)',
        [surveyId, survey.active_date, openEndedText || null]
      );
      
      const submissionId = subResult.lastID;

      // Insert answers
      for (const ans of answers) {
        const ratingVal = ans.rating !== undefined && ans.rating !== null ? parseInt(ans.rating) : null;
        const choiceVal = ans.choiceAnswer || null;

        await db.run(
          'INSERT INTO answers (submission_id, question_id, rating, choice_answer) VALUES (?, ?, ?, ?)',
          [submissionId, ans.questionId, ratingVal, choiceVal]
        );
      }

      await db.run('COMMIT');

      return new Response(JSON.stringify({ success: true, message: 'Anketiniz başarıyla kaydedildi. Teşekkür ederiz!' }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `survey_submitted_${surveyId}_${survey.active_date}=true; Max-Age=31536000; Path=/; SameSite=Lax`
        }
      });
    } catch (txError) {
      await db.run('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    console.error('Submit survey error:', error);
    return new Response(JSON.stringify({ error: 'Anket kaydedilirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
