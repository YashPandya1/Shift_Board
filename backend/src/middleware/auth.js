import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { ROLES } from '../config/constants.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

export const isOwnerOrManager = (req, res, next) => {
  if ([ROLES.OWNER, ROLES.MANAGER].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Owner or manager access required' });
};

/** ShiftBoard is admin-only — employees cannot use the app */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({
      success: false,
      message: 'This application is for business owners and managers only',
    });
  }
  if (![ROLES.OWNER, ROLES.MANAGER].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

export const isOwner = authorize(ROLES.OWNER);
