import { getDb } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(request, { params }) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = getSessionFromCookie(cookieHeader);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Yetkisiz erişim.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { courseId } = await params;
    const { searchParams } = new URL(request.url);
    const selectedSurveyId = searchParams.get('surveyId'); // specific survey ID
    const dateFilter = searchParams.get('date'); // 'all' or specific date

    const db = await getDb();

    // Verify course belongs to instructor
    const course = await db.get('SELECT * FROM courses WHERE id = ? AND instructor_id = ?', [courseId, session.id]);
    if (!course) {
      return new Response(JSON.stringify({ error: 'Ders bulunamadı veya yetkiniz yok.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch all surveys for this course
    const surveys = await db.all('SELECT * FROM surveys WHERE course_id = ? ORDER BY created_at DESC', [courseId]);
    
    if (surveys.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        course,
        surveys: [],
        availableDates: [],
        submissionCount: 0,
        comments: [],
        questionsStats: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine target survey
    let targetSurvey = surveys[0];
    if (selectedSurveyId) {
      const found = surveys.find(s => s.id === parseInt(selectedSurveyId));
      if (found) targetSurvey = found;
    }

    // Get all unique dates with submissions for the selected survey
    const uniqueDates = await db.all(`
      SELECT DISTINCT session_date FROM submissions 
      WHERE survey_id = ? AND session_date IS NOT NULL
      ORDER BY session_date DESC
    `, [targetSurvey.id]);
    const dates = uniqueDates.map(d => d.session_date);

    // Fetch submissions
    let query = 'SELECT id, open_ended_text FROM submissions WHERE survey_id = ?';
    let queryParams = [targetSurvey.id];
    if (dateFilter && dateFilter !== 'all') {
      query += ' AND session_date = ?';
      queryParams.push(dateFilter);
    }
    const submissions = await db.all(query, queryParams);
    const submissionCount = submissions.length;
    const comments = submissions.map(s => s.open_ended_text).filter(Boolean);

    // Fetch questions for this course
    const questions = await db.all('SELECT * FROM course_questions WHERE course_id = ? ORDER BY id ASC', [courseId]);

    // Map questions to hold their average and choice frequencies
    const statsMap = {};
    for (const q of questions) {
      const parsedOptions = q.options ? JSON.parse(q.options) : [];
      statsMap[q.id] = {
        id: q.id,
        text: q.question_text,
        type: q.question_type || 'rating',
        image_url: q.image_url || null,
        options: parsedOptions,
        avg: 0,
        choices: parsedOptions.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {})
      };
    }

    if (submissionCount > 0) {
      // Fetch ratings averages for rating questions
      let avgQuery = `
        SELECT a.question_id, AVG(a.rating) as avg_rating
        FROM answers a
        JOIN submissions s ON a.submission_id = s.id
        WHERE s.survey_id = ? AND a.rating IS NOT NULL
      `;
      let avgParams = [targetSurvey.id];
      if (dateFilter && dateFilter !== 'all') {
        avgQuery += ' AND s.session_date = ?';
        avgParams.push(dateFilter);
      }
      avgQuery += ' GROUP BY a.question_id';

      const averages = await db.all(avgQuery, avgParams);
      for (const avg of averages) {
        if (statsMap[avg.question_id]) {
          statsMap[avg.question_id].avg = avg.avg_rating || 0;
        }
      }

      // Fetch choice distribution for choice/checkbox questions
      let choiceQuery = `
        SELECT a.question_id, a.choice_answer
        FROM answers a
        JOIN submissions s ON a.submission_id = s.id
        WHERE s.survey_id = ? AND a.choice_answer IS NOT NULL
      `;
      let choiceParams = [targetSurvey.id];
      if (dateFilter && dateFilter !== 'all') {
        choiceQuery += ' AND s.session_date = ?';
        choiceParams.push(dateFilter);
      }
 
      const rawChoices = await db.all(choiceQuery, choiceParams);
      for (const rc of rawChoices) {
        const qId = rc.question_id;
        const answerVal = rc.choice_answer;
        if (statsMap[qId] && statsMap[qId].choices) {
          // Check if it is a JSON array (multiple choice checkbox answers)
          if (answerVal.startsWith('[') && answerVal.endsWith(']')) {
            try {
              const parsedArray = JSON.parse(answerVal);
              if (Array.isArray(parsedArray)) {
                parsedArray.forEach(opt => {
                  const trimmedOpt = String(opt).trim();
                  if (statsMap[qId].choices[trimmedOpt] !== undefined) {
                    statsMap[qId].choices[trimmedOpt] += 1;
                  } else {
                    statsMap[qId].choices[trimmedOpt] = 1;
                  }
                });
                continue;
              }
            } catch (e) {}
          }

          // Single choice
          const trimmedVal = String(answerVal).trim();
          if (statsMap[qId].choices[trimmedVal] !== undefined) {
            statsMap[qId].choices[trimmedVal] += 1;
          } else {
            statsMap[qId].choices[trimmedVal] = 1;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      course,
      surveys,
      selectedSurveyId: targetSurvey.id,
      selectedSurveyTitle: targetSurvey.title,
      submissionCount,
      comments,
      questionsStats: Object.values(statsMap),
      availableDates: dates
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return new Response(JSON.stringify({ error: 'İstatistikler yüklenirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
