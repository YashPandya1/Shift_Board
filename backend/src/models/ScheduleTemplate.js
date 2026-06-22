import mongoose from 'mongoose';

const templateShiftSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  position: String,
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile' },
  breakLength: { type: Number, default: 0 },
  notes: String,
});

const scheduleTemplateSchema = new mongoose.Schema(
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
    },
    name: { type: String, required: true, trim: true },
    description: String,
    shifts: [templateShiftSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

scheduleTemplateSchema.index({ organizationId: 1, locationId: 1 });

export default mongoose.model('ScheduleTemplate', scheduleTemplateSchema);
