import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAllCourses,
  getCourseBySlug,
  getLesson,
  completeLesson,
  submitQuiz,
} from '../controllers/courseController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getAllCourses);
router.get('/:slug', getCourseBySlug);
router.get('/:courseSlug/lessons/:lessonSlug', getLesson);
router.post('/lessons/:lessonId/complete', completeLesson);
router.post('/quizzes/:quizId/submit', submitQuiz);

export default router;
