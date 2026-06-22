import mongoose from 'mongoose';
import { NOTIFICATION_CHANNELS } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NOTIFICATION_CHANNELS),
      required: true,
    },
    type: {
      type: String,
      enum: [
        'schedule_published',
        'shift_assigned',
        'shift_changed',
        'shift_reminder',
        'time_off_approved',
        'time_off_rejected',
        'swap_approved',
        'swap_rejected',
        'open_shift_available',
        'announcement',
        'certification_expiry',
      ],
      required: true,
    },
    title: String,
    message: { type: String, required: true },
    data: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false },
    readAt: Date,
    sentAt: Date,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
    },
    externalId: String,
    error: String,
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
