import express from 'express';
import { enrollCourse, getCourseProgress, getCourseStats, getEnrolledCourses, unenrollCourse, updateCourseProgress } from './courseController.js';
import { protect } from '../../auth/auth.js';


const router = express.Router();

// All routes are protected (require authentication)
router.use(protect);

// Course enrollment routes
router.post('/enroll', enrollCourse);
router.get('/enrolled', getEnrolledCourses);
router.get('/stats', getCourseStats);
router.get('/:courseId', getCourseProgress);
router.put('/:courseId/progress', updateCourseProgress);
router.delete('/:courseId/unenroll', unenrollCourse);

export const courseRoutes = router;