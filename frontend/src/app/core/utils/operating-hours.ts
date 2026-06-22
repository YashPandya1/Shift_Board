export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export const DAYS: { key: keyof OperatingHours; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export const DEFAULT_OPERATING_HOURS: OperatingHours = {
  monday: { open: '09:00', close: '21:00', closed: false },
  tuesday: { open: '09:00', close: '21:00', closed: false },
  wednesday: { open: '09:00', close: '21:00', closed: false },
  thursday: { open: '09:00', close: '21:00', closed: false },
  friday: { open: '09:00', close: '21:00', closed: false },
  saturday: { open: '09:00', close: '21:00', closed: false },
  sunday: { open: '09:00', close: '21:00', closed: true },
};

const DAY_INDEX: Record<keyof OperatingHours, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

/** Days marked closed in store hours — hidden from week/day views */
export const getHiddenDays = (hours?: Partial<OperatingHours>): number[] => {
  const h = { ...DEFAULT_OPERATING_HOURS, ...hours };
  return DAYS.filter((d) => h[d.key].closed).map((d) => DAY_INDEX[d.key]);
};

export const toFullCalendarBusinessHours = (hours?: Partial<OperatingHours>) => {
  const h = { ...DEFAULT_OPERATING_HOURS, ...hours };
  return DAYS
    .filter((d) => !h[d.key].closed)
    .map((d) => ({
      daysOfWeek: [DAY_INDEX[d.key]],
      startTime: h[d.key].open,
      endTime: h[d.key].close,
    }));
};

export const getCalendarTimeBounds = (hours?: Partial<OperatingHours>) => {
  const h = { ...DEFAULT_OPERATING_HOURS, ...hours };
  let earliest = 24 * 60;
  let latest = 0;

  for (const d of DAYS) {
    if (h[d.key].closed) continue;
    const [oh, om] = h[d.key].open.split(':').map(Number);
    const [ch, cm] = h[d.key].close.split(':').map(Number);
    earliest = Math.min(earliest, oh * 60 + om);
    latest = Math.max(latest, ch * 60 + cm);
  }

  const fmt = (mins: number) => {
    const hr = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };

  return earliest < 24 * 60
    ? { slotMinTime: fmt(earliest), slotMaxTime: fmt(latest || 21 * 60) }
    : { slotMinTime: '09:00:00', slotMaxTime: '21:00:00' };
};

export const formatHoursSummary = (hours?: Partial<OperatingHours>): string => {
  const h = { ...DEFAULT_OPERATING_HOURS, ...hours };
  const openDays = DAYS.filter((d) => !h[d.key].closed);
  if (!openDays.length) return 'Closed all week';
  const first = h[openDays[0].key];
  const allSame = openDays.every(
    (d) => h[d.key].open === first.open && h[d.key].close === first.close
  );
  if (allSame && openDays.length === 7) return `${first.open} – ${first.close} daily`;
  if (allSame) return `${first.open} – ${first.close}, ${openDays.length} days/week`;
  return `${openDays.length} open days/week`;
};
