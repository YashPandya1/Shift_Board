import {
  Schedule,
  Shift,
  Organization,
  EmployeeProfile,
  User,
  Location,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { getWeekBounds, calculateShiftHours, parseScheduleDate } from '../utils/helpers.js';
import { validateShiftWithinHours } from '../utils/operatingHours.js';
import { SchedulingEngine } from '../services/schedulingEngine.js';
import { sendSchedulePublishedSMS } from '../services/notificationService.js';
import { sendScheduleEmail } from '../services/emailService.js';
import { generateWeeklySchedulePDF } from '../services/pdfService.js';

export const getSchedules = async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const query = { organizationId: req.user.organizationId };
    if (locationId) query.locationId = locationId;
    if (startDate) query.weekStartDate = { $gte: new Date(startDate) };
    if (endDate) query.weekEndDate = { $lte: new Date(endDate) };

    const schedules = await Schedule.find(query)
      .populate('locationId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ weekStartDate: -1 });

    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
};

export const getWeekSchedule = async (req, res, next) => {
  try {
    const { locationId, date, view = 'location' } = req.query;
    const org = await Organization.findById(req.user.organizationId);
    const { weekStart, weekEnd } = getWeekBounds(date || new Date(), org.scheduleStartDay);

    const scheduleQuery = {
      organizationId: req.user.organizationId,
      weekStartDate: { $gte: weekStart, $lte: weekEnd },
    };
    if (locationId) scheduleQuery.locationId = locationId;

    const schedules = await Schedule.find(scheduleQuery).populate('locationId', 'name');

    const shiftQuery = {
      organizationId: req.user.organizationId,
      date: { $gte: weekStart, $lte: weekEnd },
    };
    if (locationId) shiftQuery.locationId = locationId;

    if (view === 'employee' && req.query.employeeId) {
      shiftQuery.employeeId = req.query.employeeId;
    }

    const shifts = await Shift.find(shiftQuery)
      .populate('userId', 'firstName lastName')
      .populate('employeeId', 'firstName lastName position hourlyWage phone')
      .populate('locationId', 'name operatingHours')
      .sort({ date: 1, startTime: 1 });

    const location = locationId
      ? await Location.findById(locationId).select('name operatingHours')
      : null;

    res.json({
      success: true,
      data: {
        weekStart,
        weekEnd,
        scheduleStartDay: org.scheduleStartDay,
        schedules,
        shifts,
        location,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSchedule = async (req, res, next) => {
  try {
    const { locationId, weekStartDate } = req.body;
    const org = await Organization.findById(req.user.organizationId);
    const { weekStart, weekEnd } = getWeekBounds(weekStartDate, org.scheduleStartDay);

    const existing = await Schedule.findOne({
      organizationId: req.user.organizationId,
      locationId,
      weekStartDate: weekStart,
    });
    if (existing) throw new AppError('Schedule already exists for this week', 409);

    const schedule = await Schedule.create({
      organizationId: req.user.organizationId,
      locationId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

export const createShift = async (req, res, next) => {
  try {
    const shiftData = {
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user._id,
    };

    const location = await Location.findOne({
      _id: shiftData.locationId,
      organizationId: req.user.organizationId,
    });
    if (!location) throw new AppError('Location not found', 404);

    if (shiftData.date) {
      shiftData.date = parseScheduleDate(shiftData.date);
    }

    if (!shiftData.scheduleId && shiftData.locationId && shiftData.date) {
      const org = await Organization.findById(req.user.organizationId);
      const { weekStart, weekEnd } = getWeekBounds(shiftData.date, org.scheduleStartDay);
      let schedule = await Schedule.findOne({
        organizationId: req.user.organizationId,
        locationId: shiftData.locationId,
        weekStartDate: { $gte: weekStart, $lte: weekEnd },
      });
      if (!schedule) {
        schedule = await Schedule.create({
          organizationId: req.user.organizationId,
          locationId: shiftData.locationId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          createdBy: req.user._id,
        });
      }
      shiftData.scheduleId = schedule._id;
    }

    const hoursCheck = validateShiftWithinHours(
      location,
      shiftData.date,
      shiftData.startTime,
      shiftData.endTime
    );
    if (!hoursCheck.valid) throw new AppError(hoursCheck.message, 400);

    if (shiftData.employeeId) {
      const employee = await EmployeeProfile.findById(shiftData.employeeId);
      if (employee) {
        shiftData.userId = employee.userId || undefined;
        shiftData.hourlyWage = employee.hourlyWage;
      }
    }

    shiftData.totalHours = calculateShiftHours(
      shiftData.startTime,
      shiftData.endTime,
      shiftData.breakLength
    );
    shiftData.laborCost = (shiftData.hourlyWage || 0) * shiftData.totalHours;

    const validation = await SchedulingEngine.validateShift(shiftData);

    const shift = await Shift.create(shiftData);

    const populated = await Shift.findById(shift._id)
      .populate('userId', 'firstName lastName')
      .populate('employeeId', 'firstName lastName')
      .populate('locationId', 'name');

    res.status(201).json({
      success: true,
      data: populated,
      validation,
    });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req, res, next) => {
  try {
    const shift = await Shift.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!shift) throw new AppError('Shift not found', 404);

    const updates = { ...req.body };
    if (updates.date) updates.date = parseScheduleDate(updates.date);
    Object.assign(shift, updates);

    const location = await Location.findById(shift.locationId);
    const hoursCheck = validateShiftWithinHours(
      location,
      shift.date,
      shift.startTime,
      shift.endTime
    );
    if (!hoursCheck.valid) throw new AppError(hoursCheck.message, 400);

    if (req.body.startTime || req.body.endTime || req.body.breakLength) {
      shift.totalHours = calculateShiftHours(shift.startTime, shift.endTime, shift.breakLength);
      shift.laborCost = (shift.hourlyWage || 0) * shift.totalHours;
    }

    await shift.save();

    const validation = await SchedulingEngine.validateShift(shift.toObject());

    const populated = await shift.populate([
      { path: 'userId', select: 'firstName lastName' },
      { path: 'locationId', select: 'name' },
    ]);

    res.json({ success: true, data: populated, validation });
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req, res, next) => {
  try {
    const shift = await Shift.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!shift) throw new AppError('Shift not found', 404);
    res.json({ success: true, message: 'Shift deleted' });
  } catch (error) {
    next(error);
  }
};

export const copyPreviousWeek = async (req, res, next) => {
  try {
    const { scheduleId, targetWeekStart } = req.body;
    const sourceSchedule = await Schedule.findOne({
      _id: scheduleId,
      organizationId: req.user.organizationId,
    });
    if (!sourceSchedule) throw new AppError('Source schedule not found', 404);

    const org = await Organization.findById(req.user.organizationId);
    const { weekStart: targetStart, weekEnd: targetEnd } = getWeekBounds(
      targetWeekStart,
      org.scheduleStartDay
    );

    const sourceShifts = await Shift.find({ scheduleId: sourceSchedule._id });
    const dayDiff = (targetStart - sourceSchedule.weekStartDate) / (1000 * 60 * 60 * 24);

    const newSchedule = await Schedule.create({
      organizationId: req.user.organizationId,
      locationId: sourceSchedule.locationId,
      weekStartDate: targetStart,
      weekEndDate: targetEnd,
      createdBy: req.user._id,
    });

    const newShifts = sourceShifts.map((s) => ({
      scheduleId: newSchedule._id,
      organizationId: s.organizationId,
      locationId: s.locationId,
      employeeId: s.employeeId,
      userId: s.userId,
      date: new Date(new Date(s.date).getTime() + dayDiff * 86400000),
      startTime: s.startTime,
      endTime: s.endTime,
      breakLength: s.breakLength,
      notes: s.notes,
      hourlyWage: s.hourlyWage,
      totalHours: s.totalHours,
      laborCost: s.laborCost,
      createdBy: req.user._id,
    }));

    await Shift.insertMany(newShifts);

    res.status(201).json({
      success: true,
      data: { schedule: newSchedule, shiftsCopied: newShifts.length },
    });
  } catch (error) {
    next(error);
  }
};

export const publishSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!schedule) throw new AppError('Schedule not found', 404);

    schedule.isPublished = true;
    schedule.publishedAt = new Date();
    schedule.publishedBy = req.user._id;
    await schedule.save();

    const shifts = await Shift.find({ scheduleId: schedule._id }).populate('userId');
    const uniqueUsers = [...new Map(shifts.filter((s) => s.userId).map((s) => [s.userId._id, s.userId])).values()];

    const dateRange = `${schedule.weekStartDate.toLocaleDateString()} - ${schedule.weekEndDate.toLocaleDateString()}`;

    for (const user of uniqueUsers) {
      if (user.phone) {
        await sendSchedulePublishedSMS(user, dateRange, req.user.organizationId).catch(console.error);
      }
      await sendScheduleEmail(user, { dateRange }).catch(console.error);
    }

    res.json({ success: true, data: schedule, notificationsSent: uniqueUsers.length });
  } catch (error) {
    next(error);
  }
};

export const validateShift = async (req, res, next) => {
  try {
    const validation = await SchedulingEngine.validateShift({
      ...req.body,
      organizationId: req.user.organizationId,
    });
    res.json({ success: true, data: validation });
  } catch (error) {
    next(error);
  }
};

export const suggestEmployees = async (req, res, next) => {
  try {
    const { locationId, date, startTime, endTime } = req.query;
    const suggestions = await SchedulingEngine.suggestQualifiedEmployees(
      locationId,
      date,
      startTime,
      endTime,
      req.user.organizationId
    );
    res.json({ success: true, data: suggestions });
  } catch (error) {
    next(error);
  }
};

export const exportSchedulePDF = async (req, res, next) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    }).populate('locationId', 'name');

    if (!schedule) throw new AppError('Schedule not found', 404);

    const org = await Organization.findById(req.user.organizationId);
    const shifts = await Shift.find({ scheduleId: schedule._id })
      .populate('userId', 'firstName lastName')
      .populate('employeeId', 'firstName lastName')
      .sort({ date: 1, startTime: 1 });

    const pdfBuffer = await generateWeeklySchedulePDF(schedule, shifts, {
      organizationName: org.name,
      locationName: schedule.locationId?.name,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=schedule-${schedule._id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const claimOpenShift = async (req, res, next) => {
  try {
    const shift = await Shift.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      isOpenShift: true,
      status: 'open',
    });

    if (!shift) throw new AppError('Open shift not found', 404);

    const employee = await EmployeeProfile.findOne({ userId: req.user._id });
    if (!employee) throw new AppError('Employee profile not found', 404);

    shift.claimedBy = req.user._id;
    shift.claimedAt = new Date();
    shift.status = 'claimed';
    shift.employeeId = employee._id;
    shift.userId = req.user._id;
    await shift.save();

    res.json({ success: true, data: shift, message: 'Shift claimed, pending manager approval' });
  } catch (error) {
    next(error);
  }
};

export const approveClaimedShift = async (req, res, next) => {
  try {
    const shift = await Shift.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      status: 'claimed',
    });

    if (!shift) throw new AppError('Claimed shift not found', 404);

    shift.status = 'scheduled';
    shift.approvedBy = req.user._id;
    shift.isOpenShift = false;
    await shift.save();

    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

export const clearSchedule = async (req, res, next) => {
  try {
    const { locationId, date } = req.query;
    const org = await Organization.findById(req.user.organizationId);

    let schedule = null;
    const scheduleId = req.params.id;
    if (scheduleId && scheduleId !== 'week') {
      schedule = await Schedule.findOne({
        _id: scheduleId,
        organizationId: req.user.organizationId,
      });
      if (!schedule) throw new AppError('Schedule not found', 404);
    }

    const boundsDate = schedule?.weekStartDate || date || new Date();
    const { weekStart, weekEnd } = getWeekBounds(boundsDate, org.scheduleStartDay);

    const shiftQuery = {
      organizationId: req.user.organizationId,
      date: { $gte: weekStart, $lte: weekEnd },
    };

    if (schedule) {
      shiftQuery.scheduleId = schedule._id;
    } else {
      if (!locationId) throw new AppError('locationId is required', 400);
      shiftQuery.locationId = locationId;
    }

    const result = await Shift.deleteMany(shiftQuery);

    const scheduleFilter = schedule
      ? { _id: schedule._id }
      : {
        organizationId: req.user.organizationId,
        locationId,
        weekStartDate: { $gte: weekStart, $lte: weekEnd },
      };

    await Schedule.updateMany(scheduleFilter, {
      isPublished: false,
      publishedAt: null,
      publishedBy: null,
    });

    res.json({ success: true, data: { deletedCount: result.deletedCount } });
  } catch (error) {
    next(error);
  }
};
