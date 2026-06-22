/** Stable, distinct colors per employee for calendar shifts */
const PALETTE = [
  '#1976d2', '#388e3c', '#7b1fa2', '#f57c00', '#0097a7',
  '#c2185b', '#455a64', '#5d4037', '#303f9f', '#00796b',
  '#e64a19', '#512da8', '#0288d1', '#689f38', '#fbc02d',
];

export function employeeColor(employeeId?: string | null): string {
  if (!employeeId) return '#f59e0b';
  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) {
    hash = employeeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
