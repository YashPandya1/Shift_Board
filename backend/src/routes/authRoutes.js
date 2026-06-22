import { Router } from 'express';
import {
  register, login, refreshToken, forgotPassword, resetPassword,
  verifyEmail, getMe, logout, registerValidation, loginValidation,
} from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.get('/me', authenticate, requireAdmin, getMe);
router.post('/logout', authenticate, requireAdmin, logout);

export default router;
