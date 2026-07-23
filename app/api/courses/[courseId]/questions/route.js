import { getDb } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(request, { params }) {
  try {
    const { courseId } = await params;
    const db = await getDb();
    
    const questions = await db.all(
      'SELECT id, course_id, question_text, question_type, image_url, options FROM course_questions WHERE course_id = ? ORDER BY id ASC',
      [courseId]
    );

    // Parse options string back to array
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null
    }));

    // Check if there are any submissions/answers
    const subCount = await db.get(
      'SELECT COUNT(*) as count FROM submissions WHERE survey_id IN (SELECT id FROM surveys WHERE course_id = ?)',
      [courseId]
    );
    const hasSubmissions = (subCount?.count || 0) > 0;

    return new Response(JSON.stringify({ success: true, questions: parsedQuestions, hasSubmissions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch questions error:', error);
    return new Response(JSON.stringify({ error: 'Sorular yüklenirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request, { params }) {
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
    const body = await request.json();

    const db = await getDb();
    
    // Verify course belongs to instructor
    const course = await db.get('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [courseId, session.id]);
    if (!course) {
      return new Response(JSON.stringify({ error: 'Genel oturum bulunamadı veya yetkiniz yok.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if there are any submissions/answers for this course
    const subCount = await db.get(
      'SELECT COUNT(*) as count FROM submissions WHERE survey_id IN (SELECT id FROM surveys WHERE course_id = ?)',
      [courseId]
    );
    if (subCount && subCount.count > 0) {
      return new Response(JSON.stringify({ error: 'Bu oturuma ait verilmiş cevaplar bulunmaktadır. İstatistiklerin bozulmaması için kriterler değiştirilemez.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if it is a bulk import request
    if (body.bulkQuestions && Array.isArray(body.bulkQuestions)) {
      // Delete existing questions for this course to override them
      await db.run('DELETE FROM course_questions WHERE course_id = ?', [courseId]);
      
      // Insert up to 6 questions
      const toInsert = body.bulkQuestions.slice(0, 6);
      for (const q of toInsert) {
        const text = q.text || q.questionText || '';
        const rawType = q.type || q.questionType;
        const type = ['choice', 'checkbox', 'rating'].includes(rawType) ? rawType : 'rating';
        const isOptionsType = type === 'choice' || type === 'checkbox';
        const parsedOptions = isOptionsType && Array.isArray(q.options) && q.options.length > 0
          ? JSON.stringify(q.options.map(opt => String(opt).trim()).filter(Boolean))
          : null;
        
        const finalImgUrl = q.image_url || q.imageUrl || null;
        if (text.trim()) {
          await db.run(
            'INSERT INTO course_questions (course_id, question_text, question_type, options, image_url) VALUES (?, ?, ?, ?, ?)',
            [courseId, text.trim(), type, parsedOptions, finalImgUrl]
          );
        }
      }
      
      const questions = await db.all(
        'SELECT id, course_id, question_text, question_type, image_url, options FROM course_questions WHERE course_id = ? ORDER BY id ASC',
        [courseId]
      );
      const parsedQuestions = questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null
      }));
      
      return new Response(JSON.stringify({ success: true, questions: parsedQuestions }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { questionText, questionType, options, imageUrl } = body;

    if (!questionText || !questionText.trim()) {
      return new Response(JSON.stringify({ error: 'Soru metni boş olamaz.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }


    // Check count limit (max 6 questions)
    const countResult = await db.get('SELECT COUNT(*) as count FROM course_questions WHERE course_id = ?', [courseId]);
    if (countResult.count >= 6) {
      return new Response(JSON.stringify({ error: 'Bir ders için en fazla 6 anket sorusu eklenebilir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const type = ['choice', 'checkbox', 'rating'].includes(questionType) ? questionType : 'rating';
    const isOptionsType = type === 'choice' || type === 'checkbox';
    const parsedOptions = isOptionsType && Array.isArray(options) && options.length > 0 
      ? JSON.stringify(options.map(opt => opt.trim()).filter(Boolean)) 
      : null;

    const result = await db.run(
      'INSERT INTO course_questions (course_id, question_text, question_type, options, image_url) VALUES (?, ?, ?, ?, ?)',
      [courseId, questionText.trim(), type, parsedOptions, imageUrl || null]
    );

    const newQuestion = await db.get('SELECT * FROM course_questions WHERE id = ?', [result.lastID]);
    if (newQuestion.options) {
      newQuestion.options = JSON.parse(newQuestion.options);
    }

    return new Response(JSON.stringify({ success: true, question: newQuestion }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create question error:', error);
    return new Response(JSON.stringify({ error: 'Soru eklenirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(request, { params }) {
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
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return new Response(JSON.stringify({ error: 'Soru ID belirtilmelidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();
    
    // Verify course belongs to instructor
    const course = await db.get('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [courseId, session.id]);
    if (!course) {
      return new Response(JSON.stringify({ error: 'Genel oturum bulunamadı veya yetkiniz yok.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if there are any submissions/answers for this course
    const subCount = await db.get(
      'SELECT COUNT(*) as count FROM submissions WHERE survey_id IN (SELECT id FROM surveys WHERE course_id = ?)',
      [courseId]
    );
    if (subCount && subCount.count > 0) {
      return new Response(JSON.stringify({ error: 'Bu oturuma ait verilmiş cevaplar bulunmaktadır. İstatistiklerin bozulmaması için kriterler değiştirilemez.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.run(
      'DELETE FROM course_questions WHERE id = ? AND course_id = ?',
      [questionId, courseId]
    );

    return new Response(JSON.stringify({ success: true, message: 'Soru başarıyla silindi.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete question error:', error);
    return new Response(JSON.stringify({ error: 'Soru silinirken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
