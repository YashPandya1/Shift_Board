import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: {
      street: String,
      city: String,
      province: String,
      postalCode: String,
      country: { type: String, default: 'Canada' },
    },
    phone: String,
    email: String,
    managerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    timezone: String,
    isActive: { type: Boolean, default: true },
    operatingHours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: false } },
    },
  },
  { timestamps: true }
);

locationSchema.index({ organizationId: 1, name: 1 });

export default mongoose.model('Location', locationSchema);
