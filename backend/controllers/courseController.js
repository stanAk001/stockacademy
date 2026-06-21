import db from '../config/db.js';

export const getAllCourses = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
      FROM courses c
      ORDER BY c.order_index ASC
    `);
    res.json({ success: true, courses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
};

export const getCourseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const courseRes = await db.query('SELECT * FROM courses WHERE slug = $1', [slug]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    const course = courseRes.rows[0];

    const lessonsRes = await db.query(
      `SELECT l.id, l.title, l.slug, l.order_index, l.xp_reward,
        EXISTS(SELECT 1 FROM user_progress up WHERE up.lesson_id = l.id AND up.user_id = $1 AND up.completed = true) AS completed
       FROM lessons l
       WHERE l.course_id = $2
       ORDER BY l.order_index`,
      [req.user.id, course.id]
    );

    res.json({ success: true, course, lessons: lessonsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch course' });
  }
};

export const getLesson = async (req, res) => {
  try {
    const { courseSlug, lessonSlug } = req.params;
    const { rows } = await db.query(
      `SELECT l.*, c.title AS course_title, c.slug AS course_slug
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE c.slug = $1 AND l.slug = $2`,
      [courseSlug, lessonSlug]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }
    const lesson = rows[0];

    const quizRes = await db.query(
      `SELECT q.id, q.title, q.passing_score,
        COALESCE(json_agg(json_build_object(
          'id', qq.id, 'question', qq.question,
          'options', qq.options, 'correct_answer', qq.correct_answer,
          'explanation', qq.explanation
        )) FILTER (WHERE qq.id IS NOT NULL), '[]'::json) AS questions
       FROM quizzes q
       LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
       WHERE q.lesson_id = $1
       GROUP BY q.id`,
      [lesson.id]
    );

    await db.query(
      `INSERT INTO user_progress (user_id, lesson_id, completed, completed_at)
       VALUES ($1, $2, false, NULL)
       ON CONFLICT (user_id, lesson_id) DO NOTHING`,
      [req.user.id, lesson.id]
    );

    res.json({ success: true, lesson, quiz: quizRes.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch lesson' });
  }
};

export const completeLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lessonRes = await db.query('SELECT xp_reward FROM lessons WHERE id = $1', [lessonId]);
    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }
    const xp = lessonRes.rows[0].xp_reward;

    const existing = await db.query(
      'SELECT completed FROM user_progress WHERE user_id = $1 AND lesson_id = $2',
      [req.user.id, lessonId]
    );
    const alreadyCompleted = existing.rows[0]?.completed;

    await db.query(
      `INSERT INTO user_progress (user_id, lesson_id, completed, completed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET completed = true, completed_at = NOW()`,
      [req.user.id, lessonId]
    );

    if (!alreadyCompleted) {
      await db.query('UPDATE users SET total_xp = total_xp + $1 WHERE id = $2', [xp, req.user.id]);
    }

    res.json({ success: true, xpEarned: alreadyCompleted ? 0 : xp, message: 'Lesson completed!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to complete lesson' });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;

    const qRes = await db.query('SELECT * FROM quiz_questions WHERE quiz_id = $1', [quizId]);
    const quizRes = await db.query('SELECT passing_score FROM quizzes WHERE id = $1', [quizId]);
    if (qRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    let correct = 0;
    const results = qRes.rows.map((q) => {
      const chosen = answers[q.id];
      const isCorrect = chosen === q.correct_answer;
      if (isCorrect) correct++;
      return {
        questionId: q.id,
        chosen,
        correct: q.correct_answer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = Math.round((correct / qRes.rows.length) * 100);
    const passed = score >= (quizRes.rows[0]?.passing_score || 60);

    await db.query(
      'INSERT INTO quiz_attempts (user_id, quiz_id, score, passed) VALUES ($1, $2, $3, $4)',
      [req.user.id, quizId, score, passed]
    );

    if (passed) {
      await db.query('UPDATE users SET total_xp = total_xp + 25 WHERE id = $1', [req.user.id]);
    }

    res.json({ success: true, score, passed, correct, total: qRes.rows.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit quiz' });
  }
};
