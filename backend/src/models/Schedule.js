import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema(
  {
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
    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },
    isPublished: { type: Boolean, default: false },
    publishedAt: Date,
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: String,
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleTemplate' },
    totalScheduledHours: { type: Number, default: 0 },
    totalLaborCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

scheduleSchema.index({ organizationId: 1, locationId: 1, weekStartDate: 1 }, { unique: true });
scheduleSchema.index({ weekStartDate: 1, weekEndDate: 1 });

export default mongoose.model('Schedule', scheduleSchema);
