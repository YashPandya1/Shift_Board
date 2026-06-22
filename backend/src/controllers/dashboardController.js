import {
  EmployeeProfile,
  Location,
  Shift,
  TimeOffRequest,
  Organization,
  Notification,
  Announcement,
  User,
} from '../models/index.js';
import { getWeekBounds, calculateShiftHours } from '../utils/helpers.js';
import { sendSMS, sendWhatsApp } from '../services/notificationService.js';
import { REQUEST_STATUS, SHIFT_STATUS } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';

export const getDashboard = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const org = await Organization.findById(orgId);
    const { weekStart, weekEnd } = getWeekBounds(new Date(), org?.scheduleStartDay);

    const [
      totalEmployees,
      activeLocations,
      upcomingShifts,
      openShifts,
      pendingTimeOff,
      weekShifts,
    ] = await Promise.all([
      EmployeeProfile.countDocuments({ organizationId: orgId, employmentStatus: 'active' }),
      Location.countDocuments({ organizationId: orgId, isActive: true }),
      Shift.countDocuments({
        organizationId: orgId,
        date: { $gte: new Date() },
        status: SHIFT_STATUS.SCHEDULED,
      }),
      Shift.countDocuments({
        organizationId: orgId,
        isOpenShift: true,
        status: SHIFT_STATUS.OPEN,
        date: { $gte: new Date() },
      }),
      TimeOffRequest.countDocuments({ organizationId: orgId, status: REQUEST_STATUS.PENDING }),
      Shift.find({
        organizationId: orgId,
        date: { $gte: weekStart, $lte: weekEnd },
        status: { $ne: SHIFT_STATUS.CANCELLED },
      }).populate('employeeId', 'hourlyWage'),
    ]);

    let totalHours = 0;
    let laborCost = 0;
    const overtimeThreshold = org?.overtimeThreshold || 40;
    const otMultiplier = org?.laborCostSettings?.overtimeMultiplier || 1.5;

    const employeeHours = {};
    weekShifts.forEach((shift) => {
      const hours = shift.totalHours || calculateShiftHours(shift.startTime, shift.endTime, shift.breakLength);
      totalHours += hours;
      const wage = shift.hourlyWage || shift.employeeId?.hourlyWage || 0;
      laborCost += hours * wage;

      if (shift.employeeId) {
        const empId = shift.employeeId._id.toString();
        employeeHours[empId] = (employeeHours[empId] || 0) + hours;
      }
    });

    let overtimeHours = 0;
    Object.values(employeeHours).forEach((hours) => {
      if (hours > overtimeThreshold) overtimeHours += hours - overtimeThreshold;
    });

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeLocations,
        upcomingShifts,
        openShifts,
        pendingTimeOffRequests: pendingTimeOff,
        laborCostThisWeek: Math.round(laborCost * 100) / 100,
        hoursScheduled: Math.round(totalHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        estimatedPayroll: Math.round((laborCost + overtimeHours * (weekShifts[0]?.hourlyWage || 15) * (otMultiplier - 1)) * 100) / 100,
        weekStart,
        weekEnd,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLaborCostReport = async (req, res, next) => {
  try {
    const { startDate, endDate, locationId, groupBy = 'week' } = req.query;
    const query = {
      organizationId: req.user.organizationId,
      date: {
        $gte: new Date(startDate || Date.now() - 30 * 86400000),
        $lte: new Date(endDate || Date.now()),
      },
      status: { $ne: SHIFT_STATUS.CANCELLED },
    };
    if (locationId) query.locationId = locationId;

    const shifts = await Shift.find(query)
      .populate('employeeId', 'hourlyWage')
      .populate('locationId', 'name')
      .populate('userId', 'firstName lastName');

    const report = {
      byLocation: {},
      byEmployee: {},
      totalHours: 0,
      totalCost: 0,
    };

    shifts.forEach((shift) => {
      const hours = shift.totalHours || calculateShiftHours(shift.startTime, shift.endTime, shift.breakLength);
      const cost = hours * (shift.hourlyWage || shift.employeeId?.hourlyWage || 0);
      report.totalHours += hours;
      report.totalCost += cost;

      const locName = shift.locationId?.name || 'Unknown';
      if (!report.byLocation[locName]) report.byLocation[locName] = { hours: 0, cost: 0 };
      report.byLocation[locName].hours += hours;
      report.byLocation[locName].cost += cost;

      const empName = shift.userId
        ? `${shift.userId.firstName} ${shift.userId.lastName}`
        : 'Unassigned';
      if (!report.byEmployee[empName]) report.byEmployee[empName] = { hours: 0, cost: 0 };
      report.byEmployee[empName].hours += hours;
      report.byEmployee[empName].cost += cost;
    });

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false,
    });

    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const sendNotification = async (req, res, next) => {
  try {
    const { recipientId, channel, message, type } = req.body;
    const recipient = await User.findById(recipientId);
    if (!recipient) throw new AppError('Recipient not found', 404);

    let result;
    if (channel === 'sms') {
      result = await sendSMS({
        to: recipient.phone,
        message,
        recipientId,
        organizationId: req.user.organizationId,
        type,
      });
    } else if (channel === 'whatsapp') {
      result = await sendWhatsApp({
        to: recipient.phone,
        message,
        recipientId,
        organizationId: req.user.organizationId,
        type,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({
      organizationId: req.user.organizationId,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
};