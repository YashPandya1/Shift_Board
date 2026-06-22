import mongoose from 'mongoose';
import { REQUEST_STATUS } from '../config/constants.js';

const shiftSwapRequestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requesterShiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    targetEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeProfile',
    },
    targetShiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    reason: String,
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.PENDING,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewComments: String,
    validationResults: {
      availabilityValid: Boolean,
      locationValid: Boolean,
      overtimeValid: Boolean,
      messages: [String],
    },
  },
  { timestamps: true }
);

shiftSwapRequestSchema.index({ organizationId: 1, status: 1 });
shiftSwapRequestSchema.index({ requesterId: 1 });

export default mongoose.model('ShiftSwapRequest', shiftSwapRequestSchema);
