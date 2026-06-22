import { ShiftSwapRequest, Shift, EmployeeProfile } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { REQUEST_STATUS } from '../config/constants.js';
import { SchedulingEngine } from '../services/schedulingEngine.js';

export const getSwapRequests = async (req, res, next) => {
  try {
    const query = { organizationId: req.user.organizationId };
    if (req.user.role === 'employee') query.requesterId = req.user._id;
    if (req.query.status) query.status = req.query.status;

    const requests = await ShiftSwapRequest.find(query)
      .populate('requesterId', 'firstName lastName')
      .populate('requesterShiftId')
      .populate('targetShiftId')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

export const createSwapRequest = async (req, res, next) => {
  try {
    const { requesterShiftId, targetEmployeeId, targetShiftId, reason } = req.body;

    const requesterShift = await Shift.findOne({
      _id: requesterShiftId,
      userId: req.user._id,
    });
    if (!requesterShift) throw new AppError('Shift not found or not yours', 404);

    const validationResults = { messages: [] };

    if (targetEmployeeId) {
      const availability = await SchedulingEngine.checkAvailability(
        targetEmployeeId,
        requesterShift.date,
        requesterShift.startTime,
        requesterShift.endTime
      );
      validationResults.availabilityValid = availability.isAvailable;
      if (!availability.isAvailable) validationResults.messages.push(availability.message);

      const employee = await EmployeeProfile.findById(targetEmployeeId);
      validationResults.locationValid = employee?.availableLocationIds
        ?.some((id) => id.toString() === requesterShift.locationId.toString());

      const overtime = await SchedulingEngine.checkOvertimeRisk(
        targetEmployeeId,
        req.user.organizationId,
        requesterShift.date
      );
      validationResults.overtimeValid = !overtime.exceedsThreshold;
      if (overtime.exceedsThreshold) validationResults.messages.push(overtime.message);
    }

    const swapRequest = await ShiftSwapRequest.create({
      organizationId: req.user.organizationId,
      requesterId: req.user._id,
      requesterShiftId,
      targetEmployeeId,
      targetShiftId,
      reason,
      validationResults,
    });

    res.status(201).json({ success: true, data: swapRequest });
  } catch (error) {
    next(error);
  }
};

export const reviewSwapRequest = async (req, res, next) => {
  try {
    const { status, reviewComments } = req.body;
    const swapRequest = await ShiftSwapRequest.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
      status: REQUEST_STATUS.PENDING,
    });

    if (!swapRequest) throw new AppError('Swap request not found', 404);

    if (status === REQUEST_STATUS.APPROVED) {
      const requesterShift = await Shift.findById(swapRequest.requesterShiftId);
      const targetShift = swapRequest.targetShiftId
        ? await Shift.findById(swapRequest.targetShiftId)
        : null;

      if (targetShift && swapRequest.targetEmployeeId) {
        const targetEmployee = await EmployeeProfile.findById(swapRequest.targetEmployeeId);
        const requesterEmployee = await EmployeeProfile.findOne({ userId: swapRequest.requesterId });

        requesterShift.employeeId = swapRequest.targetEmployeeId;
        requesterShift.userId = targetEmployee.userId;
        await requesterShift.save();

        targetShift.employeeId = requesterEmployee._id;
        targetShift.userId = swapRequest.requesterId;
        await targetShift.save();
      } else if (swapRequest.targetEmployeeId) {
        const targetEmployee = await EmployeeProfile.findById(swapRequest.targetEmployeeId);
        requesterShift.employeeId = swapRequest.targetEmployeeId;
        requesterShift.userId = targetEmployee.userId;
        await requesterShift.save();
      }
    }

    swapRequest.status = status;
    swapRequest.reviewComments = reviewComments;
    swapRequest.reviewedBy = req.user._id;
    swapRequest.reviewedAt = new Date();
    await swapRequest.save();

    res.json({ success: true, data: swapRequest });
  } catch (error) {
    next(error);
  }
};
