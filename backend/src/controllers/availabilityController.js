import {
  TimeOffRequest,
  Availability,
  EmployeeProfile,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { REQUEST_STATUS } from '../config/constants.js';

export const getTimeOffRequests = async (req, res, next) => {
  try {
    const query = { organizationId: req.user.organizationId };
    if (req.query.status) query.status = req.query.status;
    if (req.user.role === 'employee') query.userId = req.user._id;

    const requests = await TimeOffRequest.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('employeeId', 'position')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

export const createTimeOffRequest = async (req, res, next) => {
  try {
    const employee = await EmployeeProfile.findOne({ userId: req.user._id });
    if (!employee) throw new AppError('Employee profile not found', 404);

    const request = await TimeOffRequest.create({
      ...req.body,
      employeeId: employee._id,
      userId: req.user._id,
      organizationId: req.user.organizationId,
    });

    const populated = await request.populate('userId', 'firstName lastName');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const reviewTimeOffRequest = async (req, res, next) => {
  try {
    const { status, reviewComments } = req.body;
    if (![REQUEST_STATUS.APPROVED, REQUEST_STATUS.REJECTED].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const request = await TimeOffRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organizationId,
        status: REQUEST_STATUS.PENDING,
      },
      {
        status,
        reviewComments,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    ).populate('userId', 'firstName lastName email');

    if (!request) throw new AppError('Request not found or already reviewed', 404);
    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

export const getAvailability = async (req, res, next) => {
  try {
    const employee = await EmployeeProfile.findOne({ userId: req.user._id });
    const availability = await Availability.findOne({
      employeeId: employee?._id || req.params.employeeId,
    });
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
};

export const updateAvailability = async (req, res, next) => {
  try {
    const employee = await EmployeeProfile.findOne({
      userId: req.params.employeeId || req.user._id,
      organizationId: req.user.organizationId,
    });
    if (!employee) throw new AppError('Employee not found', 404);

    const availability = await Availability.findOneAndUpdate(
      { employeeId: employee._id },
      { ...req.body, userId: employee.userId },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
};

export const overrideAvailability = async (req, res, next) => {
  try {
    const { employeeId, overrideNotes } = req.body;
    const availability = await Availability.findOneAndUpdate(
      { employeeId },
      {
        managerOverride: {
          isOverridden: true,
          overriddenBy: req.user._id,
          overrideNotes,
          overriddenAt: new Date(),
        },
      },
      { new: true }
    );
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
};
