/** Map org scheduleStartDay to FullCalendar firstDay (0=Sun … 6=Sat) */
const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function scheduleStartDayToFirstDay(day?: string): number {
  return DAY_INDEX[(day || 'monday').toLowerCase()] ?? 1;
}

export function formatSharePhone(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}

export function buildEmployeeScheduleMessage(
  employeeName: string,
  locationName: string,
  weekLabel: string,
  shifts: { date: string; startTime: string; endTime: string; totalHours?: number }[],
): string {
  const first = employeeName.split(' ')[0] || employeeName;
  let text = `Hi ${first},\n\nYour schedule at ${locationName} (${weekLabel}):\n\n`;

  if (!shifts.length) {
    text += 'No shifts scheduled this week.\n';
    return text;
  }

  const sorted = [...shifts].sort((a, b) =>
    `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
  );

  for (const s of sorted) {
    const day = new Date(`${s.date.split('T')[0]}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    text += `${day}: ${s.startTime} – ${s.endTime}\n`;
  }

  const total = sorted.reduce((sum, s) => sum + (s.totalHours || 0), 0);
  if (total > 0) {
    text += `\nTotal: ${Math.round(total * 10) / 10} hours`;
  }

  return text;
}
