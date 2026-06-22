import mongoose from 'mongoose';
import { EMPLOYMENT_STATUS, CERTIFICATION_TYPES } from '../config/constants.js';

const certificationSchema = new mongoose.Schema({
  type: { type: String, enum: CERTIFICATION_TYPES, required: true },
  name: String,
  issuedDate: Date,
  expiryDate: Date,
  documentUrl: String,
  isExpired: { type: Boolean, default: false },
});

const employeeProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    position: { type: String, trim: true },
    hourlyWage: { type: Number, default: 0 },
    preferredLocationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
    availableLocationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
    employmentStatus: {
      type: String,
      enum: Object.values(EMPLOYMENT_STATUS),
      default: EMPLOYMENT_STATUS.ACTIVE,
    },
    hireDate: Date,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    certifications: [certificationSchema],
    internalNotes: [{ type: String }],
    performanceNotes: [
      {
        note: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    maxHoursPerWeek: { type: Number, default: 40 },
    employeeNumber: String,
  },
  { timestamps: true }
);

employeeProfileSchema.index({ organizationId: 1, employmentStatus: 1 });
employeeProfileSchema.index({ organizationId: 1, email: 1 });
employeeProfileSchema.index({ userId: 1 }, { sparse: true, unique: true });

employeeProfileSchema.virtual('displayName').get(function () {
  if (this.firstName) return `${this.firstName} ${this.lastName || ''}`.trim();
  return '';
});
employeeProfileSchema.index({ availableLocationIds: 1 });

export default mongoose.model('EmployeeProfile', employeeProfileSchema);
