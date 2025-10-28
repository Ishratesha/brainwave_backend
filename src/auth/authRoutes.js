import express from 'express';
import { body } from 'express-validator';
import { getMe, login, logout, register, updateProfile, updateProgress } from '../auth/authController.js';
import { protect } from './auth.js';



const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Private routes (require authentication)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/progress', protect, updateProgress);

export const authRoutes = router;