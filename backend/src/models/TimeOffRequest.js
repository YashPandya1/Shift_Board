import mongoose from 'mongoose';
import { TIME_OFF_TYPES, REQUEST_STATUS } from '../config/constants.js';

const timeOffRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeProfile',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TIME_OFF_TYPES),
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: String,
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.PENDING,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewComments: String,
    isPaid: { type: Boolean, default: true },
  },
  { timestamps: true }
);

timeOffRequestSchema.index({ organizationId: 1, status: 1 });
timeOffRequestSchema.index({ employeeId: 1, startDate: 1 });

export default mongoose.model('TimeOffRequest', timeOffRequestSchema);
