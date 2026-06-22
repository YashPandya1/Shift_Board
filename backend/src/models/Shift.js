import mongoose from 'mongoose';
import { SHIFT_STATUS } from '../config/constants.js';

const shiftSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeProfile',
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakLength: { type: Number, default: 0 },
    notes: String,
    status: {
      type: String,
      enum: Object.values(SHIFT_STATUS),
      default: SHIFT_STATUS.SCHEDULED,
    },
    isOpenShift: { type: Boolean, default: false },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    claimedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hourlyWage: Number,
    totalHours: Number,
    laborCost: Number,
    clockIn: Date,
    clockOut: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

shiftSchema.index({ organizationId: 1, locationId: 1, date: 1 });
shiftSchema.index({ employeeId: 1, date: 1 });
shiftSchema.index({ status: 1, isOpenShift: 1 });

export default mongoose.model('Shift', shiftSchema);
