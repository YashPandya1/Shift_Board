import PDFDocument from 'pdfkit';
import { Shift } from '../models/index.js';

const THEME = {
  primary: '#1565c0',
  primaryDark: '#0d47a1',
  accent: '#e3f2fd',
  hoursBg: '#1565c0',
  border: '#cfd8dc',
  text: '#263238',
  muted: '#607d8b',
  openShift: '#f57c00',
  white: '#ffffff',
};

const EMPLOYEE_COLORS = [
  '#1976d2', '#388e3c', '#7b1fa2', '#f57c00', '#0097a7',
  '#c2185b', '#455a64', '#5d4037', '#303f9f', '#00796b',
];

const employeeName = (shift) => {
  if (shift.isOpenShift) return 'Open Shift';
  if (shift.employeeId?.firstName) {
    return `${shift.employeeId.firstName} ${shift.employeeId.lastName || ''}`.trim();
  }
  if (shift.userId?.firstName) {
    return `${shift.userId.firstName} ${shift.userId.lastName}`.trim();
  }
  return 'Unassigned';
};

const employeeKey = (shift) => {
  if (shift.isOpenShift) return '__open__';
  const id = shift.employeeId?._id || shift.employeeId || shift.userId?._id;
  return id ? String(id) : employeeName(shift);
};

const employeeColor = (key) => {
  if (key === '__open__') return THEME.openShift;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EMPLOYEE_COLORS[Math.abs(hash) % EMPLOYEE_COLORS.length];
};

const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatDayHeader = (d) => ({
  day: d.toLocaleDateString('en-US', { weekday: 'short' }),
  date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
});

const dateKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const buildWeekDays = (weekStart) => {
  const start = new Date(weekStart);
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const drawHeader = (doc, options, weekStart, weekEnd, totalHours) => {
  const pageWidth = doc.page.width;
  doc.save();
  doc.rect(0, 0, pageWidth, 80).fill(THEME.primary);
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(22);
  doc.text(options.organizationName || 'ShiftBoard', 50, 20, { width: pageWidth - 100, align: 'left' });
  doc.font('Helvetica').fontSize(11);
  doc.text(options.locationName || 'Schedule', 50, 46);
  const weekLabel = `Week of ${formatDate(new Date(weekStart))} – ${formatDate(new Date(weekEnd))}`;
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text(weekLabel, 50, 46, { width: pageWidth - 100, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text(`Total scheduled: ${totalHours}h`, 50, 62, { width: pageWidth - 100, align: 'right' });
  doc.restore();
  doc.y = 96;
};

const drawHoursBadge = (doc, x, y, width, hours) => {
  const badgeH = 28;
  doc.save().roundedRect(x, y, width, badgeH, 4).fill(THEME.hoursBg).restore();
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(13);
  doc.text(`${hours}h`, x, y + 8, { width, align: 'center' });
};

const drawGrid = (doc, days, employeeRows) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - margin * 2;
  const nameColWidth = 96;
  const hoursColWidth = 52;
  const dayColWidth = (tableWidth - nameColWidth - hoursColWidth) / 7;
  const rowHeight = 56;
  let y = doc.y;

  const drawRowBg = (rowY, height, fill) => {
    doc.save().rect(margin, rowY, tableWidth, height).fill(fill).restore();
  };

  // Header row
  drawRowBg(y, 38, THEME.primaryDark);
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(9);
  doc.text('Employee', margin + 8, y + 14, { width: nameColWidth - 16 });
  doc.text('Hours', margin + nameColWidth + 4, y + 14, { width: hoursColWidth - 8, align: 'center' });
  days.forEach((day, i) => {
    const hdr = formatDayHeader(day);
    const x = margin + nameColWidth + hoursColWidth + i * dayColWidth;
    doc.text(hdr.day, x + 4, y + 8, { width: dayColWidth - 8, align: 'center' });
    doc.font('Helvetica').fontSize(8);
    doc.text(hdr.date, x + 4, y + 22, { width: dayColWidth - 8, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(9);
  });
  y += 38;

  if (!employeeRows.length) {
    drawRowBg(y, rowHeight, THEME.accent);
    doc.fillColor(THEME.muted).font('Helvetica').fontSize(10);
    doc.text('No shifts scheduled this week', margin + 8, y + 22, { width: tableWidth - 16, align: 'center' });
    doc.y = y + rowHeight + 12;
    return;
  }

  let weekTotal = 0;

  employeeRows.forEach((row, rowIndex) => {
    if (y + rowHeight > doc.page.height - 60) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      y = 50;
    }

    weekTotal += row.totalHours;
    const bg = rowIndex % 2 === 0 ? THEME.white : THEME.accent;
    drawRowBg(y, rowHeight, bg);

    doc.save();
    doc.circle(margin + 14, y + rowHeight / 2, 5).fill(row.color);
    doc.restore();
    doc.fillColor(THEME.text).font('Helvetica-Bold').fontSize(9);
    doc.text(row.name, margin + 26, y + 20, { width: nameColWidth - 30 });

    drawHoursBadge(doc, margin + nameColWidth + 4, y + 14, hoursColWidth - 8, row.totalHours);

    days.forEach((day, i) => {
      const key = dateKey(day);
      const cellShifts = row.shiftsByDay[key] || [];
      const x = margin + nameColWidth + hoursColWidth + i * dayColWidth;

      doc.save().strokeColor(THEME.border).lineWidth(0.5)
        .rect(x, y, dayColWidth, rowHeight).stroke().restore();

      if (cellShifts.length) {
        let cellY = y + 10;
        cellShifts.forEach((s) => {
          doc.fillColor(THEME.text).font('Helvetica-Bold').fontSize(8);
          doc.text(`${s.startTime}–${s.endTime}`, x + 4, cellY, { width: dayColWidth - 8, align: 'center' });
          cellY += 10;
          if (s.hours) {
            doc.fillColor(THEME.hoursBg).font('Helvetica-Bold').fontSize(7);
            doc.text(`${s.hours}h`, x + 4, cellY, { width: dayColWidth - 8, align: 'center' });
            cellY += 10;
          }
        });
      } else {
        doc.fillColor(THEME.border).font('Helvetica').fontSize(8);
        doc.text('—', x + 4, y + 24, { width: dayColWidth - 8, align: 'center' });
      }
    });

    y += rowHeight;
  });

  // Totals footer row
  if (y + 32 > doc.page.height - 40) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
    y = 50;
  }
  drawRowBg(y, 32, THEME.primaryDark);
  doc.fillColor(THEME.white).font('Helvetica-Bold').fontSize(10);
  doc.text('Team Total', margin + 8, y + 11);
  drawHoursBadge(doc, margin + nameColWidth + 4, y + 2, hoursColWidth - 8, Math.round(weekTotal * 10) / 10);

  doc.y = y + 40;
};

export const generateWeeklySchedulePDF = async (schedule, shifts, options = {}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const weekStart = schedule.weekStartDate;
    const weekEnd = schedule.weekEndDate;
    const days = buildWeekDays(weekStart);

    const rowMap = new Map();
    let grandTotalHours = 0;

    shifts.forEach((shift) => {
      const key = employeeKey(shift);
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key,
          name: employeeName(shift),
          color: employeeColor(key),
          shiftsByDay: {},
          totalHours: 0,
        });
      }
      const row = rowMap.get(key);
      const dk = dateKey(shift.date);
      const shiftHours = Math.round((shift.totalHours || 0) * 10) / 10;
      if (!row.shiftsByDay[dk]) row.shiftsByDay[dk] = [];
      row.shiftsByDay[dk].push({
        startTime: shift.startTime,
        endTime: shift.endTime,
        hours: shiftHours || null,
      });
      row.totalHours += shift.totalHours || 0;
      grandTotalHours += shift.totalHours || 0;
    });

    const employeeRows = [...rowMap.values()]
      .map((r) => ({ ...r, totalHours: Math.round(r.totalHours * 10) / 10 }))
      .sort((a, b) => {
        if (a.key === '__open__') return 1;
        if (b.key === '__open__') return -1;
        return a.name.localeCompare(b.name);
      });

    const totalHours = Math.round(grandTotalHours * 10) / 10;
    drawHeader(doc, options, weekStart, weekEnd, totalHours);
    drawGrid(doc, days, employeeRows);

    doc.fillColor(THEME.muted).font('Helvetica').fontSize(7);
    doc.text(
      `Generated ${new Date().toLocaleString('en-US')}  ·  ${shifts.length} shift${shifts.length === 1 ? '' : 's'}  ·  ${totalHours} total hours`,
      40,
      doc.page.height - 28,
      { width: doc.page.width - 80, align: 'center' },
    );

    doc.end();
  });
};

export const generateEmployeeSchedulePDF = async (employee, shifts, weekRange) => {
  return generateWeeklySchedulePDF(
    { weekStartDate: weekRange.start, weekEndDate: weekRange.end },
    shifts,
    { organizationName: 'Employee Schedule', locationName: `${employee.firstName} ${employee.lastName}` }
  );
};

export const getSchedulePDFData = async (scheduleId, organizationId) => {
  const shifts = await Shift.find({ scheduleId, organizationId })
    .populate('userId', 'firstName lastName')
    .populate('employeeId', 'firstName lastName')
    .populate('locationId', 'name')
    .sort({ date: 1, startTime: 1 });
  return shifts;
};
