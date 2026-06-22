import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import {
  User,
  Organization,
  EmployeeProfile,
  Availability,
} from '../models/index.js';
import { ROLES } from '../config/constants.js';
import { generateTokens, generateToken, slugify } from '../utils/helpers.js';
import { sendVerificationEmail, sendPasswordResetEmail, isEmailConfigured } from '../services/emailService.js';
import { AppError } from '../middleware/errorHandler.js';

export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('organizationName').trim().notEmpty(),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, organizationName, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError('Email already registered', 409);

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: ROLES.OWNER,
    });

    const organization = await Organization.create({
      name: organizationName,
      slug: slugify(organizationName) + '-' + Date.now().toString(36),
      ownerId: user._id,
    });

    user.organizationId = organization._id;
    await user.save();

    await EmployeeProfile.create({
      userId: user._id,
      organizationId: organization._id,
      firstName,
      lastName,
      email,
      phone,
      position: 'Owner',
      employmentStatus: 'active',
    });

    await Availability.create({
      employeeId: (await EmployeeProfile.findOne({ userId: user._id }))._id,
      userId: user._id,
      organizationId: organization._id,
    });

    const verificationToken = generateToken();
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const emailResult = await sendVerificationEmail(user, verificationToken);
    if (!isEmailConfigured() || emailResult.skipped || !emailResult.success) {
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        organization,
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) throw new AppError('Account is deactivated', 403);

    if (user.role === ROLES.EMPLOYEE) {
      throw new AppError(
        'This email is registered as a staff member, not an admin account. Use an owner or manager email, or register a new business account.',
        403
      );
    }

    if (![ROLES.OWNER, ROLES.MANAGER].includes(user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    user.lastLogin = new Date();
    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    const organization = user.organizationId
      ? await Organization.findById(user.organizationId)
      : null;

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, organization, ...tokens },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid refresh token', 401);
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = generateToken();
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      await sendPasswordResetEmail(user, resetToken).catch(() => {});
    }

    res.json({
      success: true,
      message: 'If an account exists, a reset link has been sent',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) throw new AppError('Invalid or expired reset token', 400);

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) throw new AppError('Invalid or expired verification token', 400);

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const organization = req.user.organizationId
      ? await Organization.findById(req.user.organizationId)
      : null;
    const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });

    res.json({
      success: true,
      data: { user: req.user, organization, employeeProfile },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
