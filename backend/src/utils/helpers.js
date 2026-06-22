import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

export const generateToken = () => crypto.randomBytes(32).toString('hex');

export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const parseTimeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const calculateShiftHours = (startTime, endTime, breakLength = 0) => {
  let start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return (end - start - breakLength) / 60;
};

export const parseScheduleDate = (date) => {
  if (!date) return new Date();
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  return new Date(date);
};

export const getWeekBounds = (date, startDay = 'monday') => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const startDayIndex = days.indexOf(startDay.toLowerCase());
  const d = parseScheduleDate(date);
  d.setHours(0, 0, 0, 0);

  const currentDay = d.getDay();
  let diff = currentDay - startDayIndex;
  if (diff < 0) diff += 7;

  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - diff);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

export const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

export const apiResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};
