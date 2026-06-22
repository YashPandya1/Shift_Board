import {
  Shift,
  Availability,
  EmployeeProfile,
  Organization,
  TimeOffRequest,
} from '../models/index.js';
import { calculateShiftHours, getWeekBounds } from '../utils/helpers.js';

export class SchedulingEngine {
  static async detectOverlappingShifts(employeeId, date, startTime, endTime, excludeShiftId = null) {
    const query = {
      employeeId,
      date: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      },
      status: { $ne: 'cancelled' },
    };
    if (excludeShiftId) query._id = { $ne: excludeShiftId };

    const existingShifts = await Shift.find(query);
    const newStart = this._timeToMinutes(startTime);
    const newEnd = this._timeToMinutes(endTime);

    const overlaps = existingShifts.filter((shift) => {
      const shiftStart = this._timeToMinutes(shift.startTime);
      let shiftEnd = this._timeToMinutes(shift.endTime);
      if (shiftEnd <= shiftStart) shiftEnd += 1440;

      let end = newEnd;
      if (end <= newStart) end += 1440;

      return newStart < shiftEnd && end > shiftStart;
    });

    return {
      hasOverlap: overlaps.length > 0,
      overlappingShifts: overlaps,
      message: overlaps.length > 0 ? 'Employee has overlapping shifts' : null,
    };
  }

  static async checkAvailability(employeeId, date, startTime, endTime) {
    const availability = await Availability.findOne({ employeeId });
    if (!availability) {
      return { isAvailable: true, message: 'No availability set' };
    }

    if (availability.managerOverride?.isOverridden) {
      return { isAvailable: true, message: 'Manager override active' };
    }

    const dayOfWeek = new Date(date).getDay();
    const unavailableDate = availability.unavailableDates?.find((d) => {
      const dDate = new Date(d.date);
      return dDate.toDateString() === new Date(date).toDateString();
    });

    if (unavailableDate) {
      return { isAvailable: false, message: `Unavailable: ${unavailableDate.reason || 'Marked unavailable'}` };
    }

    const approvedTimeOff = await TimeOffRequest.findOne({
      employeeId,
      status: 'approved',
      startDate: { $lte: date },
      endDate: { $gte: date },
    });

    if (approvedTimeOff) {
      return { isAvailable: false, message: `Approved time off: ${approvedTimeOff.type}` };
    }

    if (availability.recurringWeekly?.length > 0) {
      const daySlot = availability.recurringWeekly.find((s) => s.dayOfWeek === dayOfWeek);
      if (daySlot && !daySlot.isAvailable) {
        return { isAvailable: false, message: 'Not available on this day' };
      }
      if (daySlot) {
        const slotStart = this._timeToMinutes(daySlot.startTime);
        const slotEnd = this._timeToMinutes(daySlot.endTime);
        const reqStart = this._timeToMinutes(startTime);
        const reqEnd = this._timeToMinutes(endTime);
        if (reqStart < slotStart || reqEnd > slotEnd) {
          return { isAvailable: false, message: 'Outside preferred availability hours' };
        }
      }
    }

    return { isAvailable: true };
  }

  static async checkOvertimeRisk(employeeId, organizationId, weekDate, additionalHours = 0) {
    const org = await Organization.findById(organizationId);
    const threshold = org?.overtimeThreshold || 40;

    const { weekStart, weekEnd } = getWeekBounds(weekDate, org?.scheduleStartDay);

    const shifts = await Shift.find({
      employeeId,
      date: { $gte: weekStart, $lte: weekEnd },
      status: { $ne: 'cancelled' },
    });

    const scheduledHours = shifts.reduce(
      (sum, s) => sum + (s.totalHours || calculateShiftHours(s.startTime, s.endTime, s.breakLength)),
      0
    );

    const totalHours = scheduledHours + additionalHours;
    const overtimeHours = Math.max(0, totalHours - threshold);

    return {
      scheduledHours,
      totalHours,
      threshold,
      overtimeHours,
      atRisk: totalHours > threshold * 0.9,
      exceedsThreshold: totalHours > threshold,
      message: totalHours > threshold
        ? `Would exceed overtime threshold by ${(totalHours - threshold).toFixed(1)} hours`
        : null,
    };
  }

  static async suggestQualifiedEmployees(locationId, date, startTime, endTime, organizationId) {
    const employees = await EmployeeProfile.find({
      organizationId,
      availableLocationIds: locationId,
      employmentStatus: 'active',
    }).populate('userId', 'firstName lastName');

    const suggestions = [];

    for (const emp of employees) {
      const [overlap, availability, overtime] = await Promise.all([
        this.detectOverlappingShifts(emp._id, date, startTime, endTime),
        this.checkAvailability(emp._id, date, startTime, endTime),
        this.checkOvertimeRisk(emp._id, organizationId, date, calculateShiftHours(startTime, endTime)),
      ]);

      if (!overlap.hasOverlap && availability.isAvailable) {
        suggestions.push({
          employee: emp,
          score: overtime.atRisk ? 50 : 100,
          warnings: [
            overlap.message,
            availability.message !== 'No availability set' ? availability.message : null,
            overtime.message,
          ].filter(Boolean),
        });
      }
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  static async validateShift(shiftData) {
    const warnings = [];
    const errors = [];

    if (shiftData.employeeId) {
      const [overlap, availability, overtime] = await Promise.all([
        this.detectOverlappingShifts(
          shiftData.employeeId,
          shiftData.date,
          shiftData.startTime,
          shiftData.endTime,
          shiftData._id
        ),
        this.checkAvailability(shiftData.employeeId, shiftData.date, shiftData.startTime, shiftData.endTime),
        this.checkOvertimeRisk(
          shiftData.employeeId,
          shiftData.organizationId,
          shiftData.date,
          calculateShiftHours(shiftData.startTime, shiftData.endTime, shiftData.breakLength)
        ),
      ]);

      if (overlap.hasOverlap) errors.push(overlap.message);
      if (!availability.isAvailable) warnings.push(availability.message);
      if (overtime.exceedsThreshold) warnings.push(overtime.message);
      if (overtime.atRisk && !overtime.exceedsThreshold) warnings.push('Approaching overtime threshold');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static async detectStaffingShortages(locationId, date, requiredStaff = 1) {
    const shifts = await Shift.find({
      locationId,
      date: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      },
      status: { $ne: 'cancelled' },
    });

    const assigned = shifts.filter((s) => s.employeeId && !s.isOpenShift).length;
    const openShifts = shifts.filter((s) => s.isOpenShift).length;

    return {
      required: requiredStaff,
      assigned,
      openShifts,
      shortage: Math.max(0, requiredStaff - assigned),
      hasShortage: assigned < requiredStaff,
    };
  }

  static _timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
