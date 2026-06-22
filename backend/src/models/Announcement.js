import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    locationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: Date,
    isPinned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

announcementSchema.index({ organizationId: 1, isActive: 1, createdAt: -1 });

export default mongoose.model('Announcement', announcementSchema);
