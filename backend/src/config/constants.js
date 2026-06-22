export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const EMPLOYMENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  TERMINATED: 'terminated',
};

export const SCHEDULE_START_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

export const TIME_OFF_TYPES = {
  VACATION: 'vacation',
  SICK: 'sick',
  UNPAID: 'unpaid',
  PERSONAL: 'personal',
  AVAILABILITY_CHANGE: 'availability_change',
};

export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export const SHIFT_STATUS = {
  SCHEDULED: 'scheduled',
  OPEN: 'open',
  CLAIMED: 'claimed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const NOTIFICATION_CHANNELS = {
  SMS: 'sms',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  IN_APP: 'in_app',
};

export const CERTIFICATION_TYPES = [
  'food_handler',
  'smart_serve',
  'first_aid',
  'cpr',
  'whmis',
  'other',
];
