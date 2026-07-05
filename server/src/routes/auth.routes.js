import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, refreshAccessToken, verifyEmail, forgotPassword, resetPassword, googleAuth, googleCallback, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/index.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts, try again later' } });

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refreshAccessToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/me', authenticate, getMe);

export default router;
