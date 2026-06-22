const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DEFAULT_HOURS = { open: '09:00', close: '21:00', closed: false };

export const getDayName = (date) => DAY_NAMES[new Date(date).getDay()];

export const getDayHours = (location, date) => {
  const day = getDayName(date);
  const hours = location?.operatingHours?.[day];
  if (!hours || hours.closed) return { closed: true };
  return {
    closed: false,
    open: hours.open || DEFAULT_HOURS.open,
    close: hours.close || DEFAULT_HOURS.close,
  };
};

export const parseTimeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const validateShiftWithinHours = (location, date, startTime, endTime) => {
  const dayHours = getDayHours(location, date);

  if (dayHours.closed) {
    return { valid: false, message: `Location is closed on ${getDayName(date)}` };
  }

  const openMin = parseTimeToMinutes(dayHours.open);
  const closeMin = parseTimeToMinutes(dayHours.close);
  const startMin = parseTimeToMinutes(startTime);
  let endMin = parseTimeToMinutes(endTime);

  if (endMin <= startMin) endMin += 24 * 60;

  const closeBound = closeMin <= openMin ? closeMin + 24 * 60 : closeMin;

  if (startMin < openMin) {
    return { valid: false, message: `Shift starts before opening (${dayHours.open})` };
  }
  if (endMin > closeBound) {
    return { valid: false, message: `Shift ends after closing (${dayHours.close})` };
  }

  return { valid: true, open: dayHours.open, close: dayHours.close };
};

export const getWeekCalendarBounds = (location) => {
  let earliest = 24 * 60;
  let latest = 0;

  for (const day of DAY_NAMES) {
    const hours = location?.operatingHours?.[day];
    if (!hours || hours.closed) continue;
    const open = parseTimeToMinutes(hours.open || DEFAULT_HOURS.open);
    let close = parseTimeToMinutes(hours.close || DEFAULT_HOURS.close);
    if (close <= open) close += 24 * 60;
    earliest = Math.min(earliest, open);
    latest = Math.max(latest, close % (24 * 60) || 24 * 60);
  }

  if (earliest === 24 * 60) {
    return { slotMinTime: '09:00:00', slotMaxTime: '21:00:00' };
  }

  const fmt = (mins) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };

  return { slotMinTime: fmt(earliest), slotMaxTime: fmt(latest) };
};

export const toFullCalendarBusinessHours = (location) => {
  const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const result = [];

  for (const [day, index] of Object.entries(DAY_INDEX)) {
    const hours = location?.operatingHours?.[day];
    if (!hours || hours.closed) continue;
    result.push({
      daysOfWeek: [index],
      startTime: hours.open || DEFAULT_HOURS.open,
      endTime: hours.close || DEFAULT_HOURS.close,
    });
  }

  return result.length ? result : [{ daysOfWeek: [1, 2, 3, 4, 5, 6, 0], startTime: '09:00', endTime: '21:00' }];
};
