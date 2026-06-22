import mongoose from 'mongoose';

const weeklySlotSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    required: true,
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
});

const availabilitySchema = new mongoose.Schema(
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
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    recurringWeekly: [weeklySlotSchema],
    unavailableDates: [
      {
        date: { type: Date, required: true },
        reason: String,
        allDay: { type: Boolean, default: true },
        startTime: String,
        endTime: String,
      },
    ],
    preferredHours: {
      minHoursPerWeek: Number,
      maxHoursPerWeek: Number,
      preferredShifts: [{ startTime: String, endTime: String }],
    },
    managerOverride: {
      isOverridden: { type: Boolean, default: false },
      overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      overrideNotes: String,
      overriddenAt: Date,
    },
  },
  { timestamps: true }
);

availabilitySchema.index({ organizationId: 1, userId: 1 });

export default mongoose.model('Availability', availabilitySchema);
