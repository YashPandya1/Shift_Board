import PDFDocument from 'pdfkit';
import { Shift } from '../models/index.js';

const THEME = {
  primary: '#1565c0',
  primaryDark: '#0d47a1',
  accent: '#f2f7fc',
  border: '#b8c5d1',
  text: '#263238',
  muted: '#607d8b',
  white: '#ffffff',
};

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

const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatTime12 = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

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
  doc.fillColor(THEME.primaryDark).font('Helvetica-Bold').fontSize(20);
  doc.text(options.organizationName || 'ShiftBoard', 40, 24, { width: pageWidth - 80, align: 'left' });
  doc.fillColor(THEME.text).font('Helvetica').fontSize(10);
  doc.text(options.locationName || 'Schedule', 40, 49);
  const weekLabel = `Week of ${formatDate(new Date(weekStart))} – ${formatDate(new Date(weekEnd))}`;
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text(weekLabel, 40, 32, { width: pageWidth - 80, align: 'right' });
  doc.fillColor(THEME.muted).font('Helvetica').fontSize(9);
  doc.text(`Total scheduled: ${totalHours}h`, 40, 50, { width: pageWidth - 80, align: 'right' });
  doc.moveTo(40, 70).lineTo(pageWidth - 40, 70).lineWidth(1.5).strokeColor(THEME.primary).stroke();
  doc.restore();
  doc.y = 82;
};

const drawScheduleGrid = (doc, days, shiftsByDay) => {
  const margin = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - margin * 2;
  const dayColWidth = tableWidth / 7;
  const blockHeight = 34;
  const maxPerDay = Math.max(1, ...days.map((day) => (shiftsByDay[dateKey(day)] || []).length));
  const rowsPerPage = Math.max(1, Math.floor((doc.page.height - doc.y - 105) / blockHeight));
  let y = doc.y;

  for (let pageStart = 0; pageStart < maxPerDay; pageStart += rowsPerPage) {
    if (pageStart > 0) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      y = 50;
    }

    doc.save().rect(margin, y, tableWidth, 38).fill(THEME.accent).restore();
    days.forEach((day, i) => {
      const hdr = formatDayHeader(day);
      const x = margin + i * dayColWidth;
      doc.save().strokeColor(THEME.border).lineWidth(0.5).rect(x, y, dayColWidth, 38).stroke().restore();
      doc.fillColor(THEME.primaryDark).font('Helvetica-Bold').fontSize(9);
      doc.text(hdr.day, x + 4, y + 8, { width: dayColWidth - 8, align: 'center' });
      doc.fillColor(THEME.muted).font('Helvetica').fontSize(8);
      doc.text(hdr.date, x + 4, y + 21, { width: dayColWidth - 8, align: 'center' });
    });
    y += 38;

    const pageEnd = Math.min(maxPerDay, pageStart + rowsPerPage);
    for (let rowIndex = pageStart; rowIndex < pageEnd; rowIndex++) {
      days.forEach((day, dayIndex) => {
        const shift = (shiftsByDay[dateKey(day)] || [])[rowIndex];
        const x = margin + dayIndex * dayColWidth;
        doc.save().strokeColor(THEME.border).lineWidth(0.5).rect(x, y, dayColWidth, blockHeight).stroke().restore();
        if (shift) {
          doc.save().rect(x + 2, y + 2, 2, blockHeight - 4).fill(THEME.primary).restore();
          doc.fillColor(THEME.text).font('Helvetica-Bold').fontSize(7.5);
          doc.text(employeeName(shift), x + 7, y + 6, {
            width: dayColWidth - 11, ellipsis: true, align: 'left',
          });
          doc.fillColor(THEME.muted).font('Helvetica').fontSize(7);
          doc.text(`${formatTime12(shift.startTime)} – ${formatTime12(shift.endTime)}`, x + 7, y + 19, {
            width: dayColWidth - 11, align: 'left',
          });
        } else if (maxPerDay === 1) {
          doc.fillColor(THEME.border).font('Helvetica').fontSize(8);
          doc.text('—', x + 4, y + 13, { width: dayColWidth - 8, align: 'center' });
        }
      });
      y += blockHeight;
    }
  }

  doc.y = y + 14;
};

const drawEmployeeHoursTable = (doc, employeeRows) => {
  const margin = 40;
  const tableWidth = doc.page.width - margin * 2;
  const rowHeight = 24;
  let y = doc.y;

  if (y + 48 + employeeRows.length * rowHeight > doc.page.height - 38) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
    y = 50;
  }

  doc.fillColor(THEME.primaryDark).font('Helvetica-Bold').fontSize(11);
  doc.text('Employee hours', margin, y);
  y += 20;

  doc.save().rect(margin, y, tableWidth, rowHeight).fill(THEME.accent).restore();
  doc.fillColor(THEME.primaryDark).font('Helvetica-Bold').fontSize(8.5);
  doc.text('Employee', margin + 8, y + 8, { width: tableWidth - 110 });
  doc.text('Hours', margin + tableWidth - 90, y + 8, { width: 80, align: 'right' });
  y += rowHeight;

  employeeRows.filter((row) => row.key !== '__open__').forEach((row, index) => {
    if (index % 2 === 1) {
      doc.save().rect(margin, y, tableWidth, rowHeight).fill('#fafbfd').restore();
    }
    doc.save().strokeColor(THEME.border).lineWidth(0.4).rect(margin, y, tableWidth, rowHeight).stroke().restore();
    doc.fillColor(THEME.text).font('Helvetica').fontSize(8.5);
    doc.text(row.name, margin + 8, y + 8, { width: tableWidth - 110 });
    doc.font('Helvetica-Bold');
    doc.text(`${row.totalHours}h`, margin + tableWidth - 90, y + 8, { width: 80, align: 'right' });
    y += rowHeight;
  });

  doc.y = y + 8;
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
    const shiftsByDay = {};
    let grandTotalHours = 0;

    shifts.forEach((shift) => {
      const key = employeeKey(shift);
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key,
          name: employeeName(shift),
          totalHours: 0,
        });
      }
      const row = rowMap.get(key);
      const dk = dateKey(shift.date);
      if (!shiftsByDay[dk]) shiftsByDay[dk] = [];
      shiftsByDay[dk].push(shift);
      row.totalHours += shift.totalHours || 0;
      grandTotalHours += shift.totalHours || 0;
    });

    Object.values(shiftsByDay).forEach((dayShifts) => {
      dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    const employeeRows = [...rowMap.values()]
      .map((r) => ({ ...r, totalHours: Math.round(r.totalHours * 10) / 10 }))
      .sort((a, b) => {
        if (a.key === '__open__') return 1;
        if (b.key === '__open__') return -1;
        return b.totalHours - a.totalHours || a.name.localeCompare(b.name);
      });

    const totalHours = Math.round(grandTotalHours * 10) / 10;
    drawHeader(doc, options, weekStart, weekEnd, totalHours);
    drawScheduleGrid(doc, days, shiftsByDay);
    drawEmployeeHoursTable(doc, employeeRows);

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
