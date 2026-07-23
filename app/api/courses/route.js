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
    // Return all courses (both active and archived) so the hoca dashboard tabs can sort them
    const courses = await db.all(
      'SELECT * FROM courses WHERE instructor_id = ? ORDER BY created_at DESC',
      [session.id]
    );

    // Fetch surveys for these courses
    const surveys = await db.all(
      `SELECT s.* FROM surveys s 
       JOIN courses c ON s.course_id = c.id 
       WHERE c.instructor_id = ?`,
      [session.id]
    );

    return new Response(JSON.stringify({ success: true, courses, surveys }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch courses error:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

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

    const { name, code } = await request.json();

    if (!name || !code) {
      return new Response(JSON.stringify({ error: 'Genel oturum adı ve kodu gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getDb();
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      const result = await db.run(
        'INSERT INTO courses (name, code, instructor_id, archived) VALUES (?, ?, ?, 0)',
        [name.trim(), code.toUpperCase().trim(), session.id]
      );
      
      const courseId = result.lastID;
      
      // Auto create a default survey for the course
      await db.run('INSERT INTO surveys (course_id, title) VALUES (?, ?)', [courseId, '1. Oturum']);
      
      // Insert default questions for the course
      const defaultQuestions = [
        'Bu derse ilgi düzeyiniz nedir?',
        'Bu dersin zorluk derecesi nedir?',
        'Bu dersin getirdiği iş yükü düzeyi nedir?',
        'Ders konularının beklentilerinizi karşılama derecesi nedir?'
      ];

      for (const qText of defaultQuestions) {
        await db.run(
          'INSERT INTO course_questions (course_id, question_text) VALUES (?, ?)',
          [courseId, qText]
        );
      }
      
      await db.run('COMMIT');
      
      const newCourse = await db.get('SELECT * FROM courses WHERE id = ?', [courseId]);
      return new Response(JSON.stringify({ success: true, course: newCourse }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (txError) {
      await db.run('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    console.error('Create course error:', error);
    return new Response(JSON.stringify({ error: 'Ders oluşturulurken hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = getSessionFromCookie(cookieHeader);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Yetkisiz erişim.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { courseId, archived, name, code } = await request.json();

    if (courseId === undefined) {
      return new Response(JSON.stringify({ error: 'Eksik parametreler. courseId gereklidir.' }), {
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

    if (customQrUrl !== undefined) {
      await db.run(
        'UPDATE courses SET custom_qr_url = ? WHERE id = ?',
        [customQrUrl || null, courseId]
      );
    }

    if (archived !== undefined) {
      await db.run(
        'UPDATE courses SET archived = ? WHERE id = ?',
        [parseInt(archived), courseId]
      );
    }

    if (name !== undefined || code !== undefined) {
      if (name !== undefined && !name.trim()) {
        return new Response(JSON.stringify({ error: 'Genel oturum adı boş olamaz.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (code !== undefined && !code.trim()) {
        return new Response(JSON.stringify({ error: 'Genel oturum kodu boş olamaz.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (name !== undefined && code !== undefined) {
        await db.run(
          'UPDATE courses SET name = ?, code = ? WHERE id = ?',
          [name.trim(), code.toUpperCase().trim(), courseId]
        );
      } else if (name !== undefined) {
        await db.run(
          'UPDATE courses SET name = ? WHERE id = ?',
          [name.trim(), courseId]
        );
      } else if (code !== undefined) {
        await db.run(
          'UPDATE courses SET code = ? WHERE id = ?',
          [code.toUpperCase().trim(), courseId]
        );
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Genel oturum başarıyla güncellendi.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update course error:', error);
    return new Response(JSON.stringify({ error: 'Güncelleme sırasında hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = getSessionFromCookie(cookieHeader);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Yetkisiz erişim.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return new Response(JSON.stringify({ error: 'Eksik parametreler.' }), {
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

    await db.run('DELETE FROM courses WHERE id = ?', [courseId]);

    return new Response(JSON.stringify({ success: true, message: 'Genel oturum başarıyla silindi.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete course error:', error);
    return new Response(JSON.stringify({ error: 'Silme işlemi sırasında hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
