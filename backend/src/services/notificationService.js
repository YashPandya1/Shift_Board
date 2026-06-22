import twilio from 'twilio';
import { Notification } from '../models/index.js';
import { NOTIFICATION_CHANNELS } from '../config/constants.js';

let twilioClient = null;

const getTwilioClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

export const sendSMS = async ({ to, message, recipientId, organizationId, type = 'shift_reminder' }) => {
  const notification = await Notification.create({
    organizationId,
    recipientId,
    channel: NOTIFICATION_CHANNELS.SMS,
    type,
    message,
    title: 'ShiftBoard Notification',
  });

  const client = getTwilioClient();
  if (!client) {
    console.log(`[SMS Mock] To: ${to}, Message: ${message}`);
    notification.deliveryStatus = 'sent';
    notification.sentAt = new Date();
    await notification.save();
    return { success: true, mock: true, notificationId: notification._id };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    notification.deliveryStatus = 'delivered';
    notification.sentAt = new Date();
    notification.externalId = result.sid;
    await notification.save();
    return { success: true, sid: result.sid };
  } catch (error) {
    notification.deliveryStatus = 'failed';
    notification.error = error.message;
    await notification.save();
    throw error;
  }
};

export const sendSchedulePublishedSMS = async (user, dateRange, organizationId) => {
  const message = `Hi ${user.firstName}, your ShiftBoard schedule for ${dateRange} is available.`;
  return sendSMS({
    to: user.phone,
    message,
    recipientId: user._id,
    organizationId,
    type: 'schedule_published',
  });
};

export const sendShiftReminderSMS = async (user, shift, organizationId) => {
  const message = `You are scheduled on ${shift.dayName} from ${shift.startTime} - ${shift.endTime} at ${shift.locationName}.`;
  return sendSMS({
    to: user.phone,
    message,
    recipientId: user._id,
    organizationId,
    type: 'shift_reminder',
  });
};

export const sendWhatsApp = async ({ to, message, recipientId, organizationId, type = 'shift_reminder' }) => {
  const notification = await Notification.create({
    organizationId,
    recipientId,
    channel: NOTIFICATION_CHANNELS.WHATSAPP,
    type,
    message,
    title: 'ShiftBoard WhatsApp',
  });

  const client = getTwilioClient();
  if (!client) {
    console.log(`[WhatsApp Mock] To: ${to}, Message: ${message}`);
    notification.deliveryStatus = 'sent';
    notification.sentAt = new Date();
    await notification.save();
    return { success: true, mock: true };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.WHATSAPP_FROM,
      to: `whatsapp:${to}`,
    });
    notification.deliveryStatus = 'delivered';
    notification.sentAt = new Date();
    notification.externalId = result.sid;
    await notification.save();
    return { success: true, sid: result.sid };
  } catch (error) {
    notification.deliveryStatus = 'failed';
    notification.error = error.message;
    await notification.save();
    throw error;
  }
};
