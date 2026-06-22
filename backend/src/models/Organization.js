import mongoose from 'mongoose';
import { SCHEDULE_START_DAYS } from '../config/constants.js';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    logo: { type: String },
    timezone: { type: String, default: 'America/Toronto' },
    scheduleStartDay: {
      type: String,
      enum: SCHEDULE_START_DAYS,
      default: 'monday',
    },
    overtimeThreshold: { type: Number, default: 40 },
    laborCostSettings: {
      hourlyWageEnabled: { type: Boolean, default: false },
      includeOvertimeMultiplier: { type: Boolean, default: true },
      overtimeMultiplier: { type: Number, default: 1.5 },
      currency: { type: String, default: 'CAD' },
    },
    notificationPreferences: {
      smsEnabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: true },
      whatsappEnabled: { type: Boolean, default: false },
      schedulePublished: { type: Boolean, default: true },
      shiftChanges: { type: Boolean, default: true },
      timeOffUpdates: { type: Boolean, default: true },
    },
    branding: {
      primaryColor: { type: String, default: '#1976d2' },
      secondaryColor: { type: String, default: '#424242' },
      accentColor: { type: String, default: '#ff4081' },
    },
    defaultLanguage: { type: String, default: 'en' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

organizationSchema.index({ ownerId: 1 });

export default mongoose.model('Organization', organizationSchema);
