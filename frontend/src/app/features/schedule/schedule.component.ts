import { Component, inject, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { MatSelectModule } from '@angular/material/select';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatMenuModule } from '@angular/material/menu';

import { MatDialog } from '@angular/material/dialog';

import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';

import {
  CalendarOptions, EventClickArg, EventDropArg, DateSelectArg, EventInput, EventContentArg,
} from '@fullcalendar/core';

import dayGridPlugin from '@fullcalendar/daygrid';

import timeGridPlugin from '@fullcalendar/timegrid';

import interactionPlugin from '@fullcalendar/interaction';

import { ScheduleService, LocationService } from '../../core/services';

import { AuthService } from '../../core/services/auth.service';

import { Shift, Location, Schedule, employeeDisplayName } from '../../core/models';

import {

  toFullCalendarBusinessHours, getCalendarTimeBounds, getHiddenDays, formatHoursSummary,

} from '../../core/utils/operating-hours';

import {
  scheduleStartDayToFirstDay,
} from '../../core/utils/schedule-utils';

import { ShiftDialogComponent } from './shift-dialog.component';



function formatLocalDate(d: Date): string {

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

}



function formatTime(d: Date): string {

  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

}

function format12Hour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}



@Component({

  selector: 'sb-schedule',

  standalone: true,

  imports: [

    RouterLink, MatButtonModule, MatIconModule, MatSelectModule,

    MatFormFieldModule, MatMenuModule, FullCalendarModule, DecimalPipe,

  ],

  template: `

    <div class="sb-page">

      <div class="sb-page-header">

        <h1>Schedule</h1>

        <div class="header-actions">

          <mat-form-field appearance="outline" class="location-select">

            <mat-label>Location</mat-label>

            <mat-select [(value)]="selectedLocationId" (selectionChange)="onLocationChange()">

              @for (loc of locations; track loc._id) {

                <mat-option [value]="loc._id">{{ loc.name }}</mat-option>

              }

            </mat-select>

          </mat-form-field>

          <button mat-stroked-button (click)="openAddShift()" [disabled]="!selectedLocationId">

            <mat-icon>add</mat-icon> Add Shift

          </button>

          <button mat-flat-button color="primary" (click)="publishSchedule()" [disabled]="!currentScheduleId">

            <mat-icon>publish</mat-icon> Publish

          </button>

          <button mat-stroked-button [matMenuTriggerFor]="moreMenu">

            <mat-icon>more_vert</mat-icon>

          </button>

          <mat-menu #moreMenu="matMenu">

            <button mat-menu-item (click)="copyPreviousWeek()" [disabled]="!selectedLocationId || !weekStart">

              <mat-icon>content_copy</mat-icon> Copy Previous Week

            </button>

            <button mat-menu-item (click)="exportExcel()" [disabled]="!shifts.length">

              <mat-icon>table_view</mat-icon> Export to Excel

            </button>

            <button mat-menu-item (click)="exportPDF()" [disabled]="!currentScheduleId">

              <mat-icon>picture_as_pdf</mat-icon> Export PDF

            </button>

            <button mat-menu-item (click)="clearSchedule()" [disabled]="!shifts.length">

              <mat-icon>delete_sweep</mat-icon> Clear Schedule

            </button>

          </mat-menu>

        </div>

      </div>



      @if (!locations.length) {

        <div class="sb-card empty-state">

          <mat-icon>store</mat-icon>

          <p>Add a location first, then build your schedule here.</p>

          <a mat-flat-button color="primary" routerLink="/locations">Go to Locations</a>

        </div>

      } @else if (selectedLocation) {

        <p class="hours-hint">

          <mat-icon>schedule</mat-icon>

          Calendar shows store hours only ({{ hoursSummary }}). Click and drag to add a shift.

        </p>



        <div class="view-toggle">

          <button mat-button [class.active]="currentView === 'timeGridWeek'" (click)="changeView('timeGridWeek')">Week</button>

          <button mat-button [class.active]="currentView === 'timeGridDay'" (click)="changeView('timeGridDay')">Day</button>

          <button mat-button [class.active]="currentView === 'dayGridMonth'" (click)="changeView('dayGridMonth')">Month</button>

        </div>



        <div class="sb-card calendar-container">

          <full-calendar #calendar [options]="calendarOptions" />

        </div>

        @if (weeklyEmployeeHours.length) {

          <section class="sb-card hours-table-card">

            <h2>Weekly employee hours</h2>

            <table class="hours-table">

              <thead>
                <tr><th>Employee</th><th>Shifts</th><th>Hours</th></tr>
              </thead>

              <tbody>
                @for (employee of weeklyEmployeeHours; track employee.id) {
                  <tr>
                    <td>{{ employee.name }}</td>
                    <td>{{ employee.shiftCount }}</td>
                    <td>{{ employee.hours | number:'1.1-2' }}</td>
                  </tr>
                }
              </tbody>

            </table>

          </section>

        }

      }

    </div>

  `,

  styles: [`

    .header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

    .location-select { width: 200px; margin: 0; }

    .hours-hint {

      display: flex; align-items: center; gap: 6px; font-size: 0.875rem;

      color: var(--sb-text-secondary); margin: 0 0 12px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }

    }

    .view-toggle { margin-bottom: 16px;

      button.active { background: rgba(25,118,210,0.1); color: var(--sb-primary); }

    }

    .calendar-container { padding: 0; overflow: hidden; border: 1px solid #d8e3ef; box-shadow: none; }
    .hours-table-card { margin-top: 16px; padding: 18px; box-shadow: none; border: 1px solid #d8e3ef; }
    .hours-table-card h2 { margin: 0 0 12px; color: #24496d; font-size: 1rem; }
    .hours-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .hours-table th, .hours-table td { padding: 8px 10px; border-bottom: 1px solid #e4eaf0; text-align: left; }
    .hours-table th { color: #496783; font-weight: 600; background: #f6f9fc; }
    .hours-table th:last-child, .hours-table td:last-child { text-align: right; }
    :host ::ng-deep .fc .fc-timegrid-slot-label,
    :host ::ng-deep .fc .fc-col-header-cell-cushion { color: #36536e; font-size: 0.78rem; }
    :host ::ng-deep .fc .fc-event { box-shadow: none; }
    :host ::ng-deep .compact-shift {
      display: flex; align-items: flex-start; gap: 4px; min-width: 0; padding: 2px 3px;
      font-size: 0.72rem; line-height: 1.15;
    }
    :host ::ng-deep .employee-indicator {
      display: inline-flex; align-items: center; justify-content: center; flex: 0 0 20px;
      width: 20px; height: 20px; border-radius: 50%; color: #fff; background: #2f6fa9;
      font-size: 0.58rem; font-weight: 700;
    }
    :host ::ng-deep .shift-details { overflow: hidden; }
    :host ::ng-deep .shift-employee { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    :host ::ng-deep .shift-time { white-space: nowrap; font-size: 0.64rem; opacity: 0.85; }

    .empty-state {

      text-align: center; padding: 48px 24px;

      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--sb-text-secondary); }

      p { color: var(--sb-text-secondary); margin: 16px 0; }

    }

    @media print {
      .sb-page-header, .hours-hint, .view-toggle { display: none !important; }
      .calendar-container, .hours-table-card { border: 1px solid #999; box-shadow: none; break-inside: avoid; }
      :host ::ng-deep .fc .fc-button { display: none !important; }
      :host ::ng-deep .fc .fc-event {
        background: #fff !important; border: 1px solid #777 !important; color: #111 !important;
      }
      :host ::ng-deep .employee-indicator {
        background: #fff !important; border: 1px solid #555; color: #111 !important;
      }
      .hours-table th { background: #fff; }
    }

  `],

})

export class ScheduleComponent implements OnInit {

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;



  private scheduleService = inject(ScheduleService);

  private locationService = inject(LocationService);

  private auth = inject(AuthService);

  private dialog = inject(MatDialog);

  private cdr = inject(ChangeDetectorRef);



  locations: Location[] = [];

  selectedLocationId = '';

  selectedLocation: Location | null = null;

  shifts: Shift[] = [];

  currentScheduleId = '';

  currentView = 'timeGridWeek';

  hoursSummary = '';

  weeklyEmployeeHours: { id: string; name: string; shiftCount: number; hours: number }[] = [];

  scheduleStartDay = 'monday';

  weekStart = '';

  weekEnd = '';

  private loadedWeekKey = '';



  calendarOptions: CalendarOptions = {

    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],

    initialView: 'timeGridWeek',

    headerToolbar: { left: 'prev,next today', center: 'title', right: '' },

    editable: true,

    selectable: true,

    selectMirror: true,

    slotMinTime: '09:00:00',

    slotMaxTime: '21:00:00',

    slotDuration: '00:30:00',

    slotLabelFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },

    eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },

    allDaySlot: false,

    height: 'auto',

    nowIndicator: true,

    businessHours: true,

    selectConstraint: 'businessHours',

    eventConstraint: 'businessHours',

    events: [],

    eventContent: (info) => this.renderEventContent(info),

    eventClick: (info) => this.onEventClick(info),

    select: (info) => this.onDateSelect(info),

    eventDrop: (info) => this.onEventDrop(info),

    datesSet: (info) => this.onDatesSet(info),

  };



  ngOnInit(): void {

    this.auth.organization$.subscribe((org) => {

      if (org?.scheduleStartDay) {

        this.scheduleStartDay = org.scheduleStartDay;

        this.applyScheduleStartDay();

      }

    });

    this.locationService.getAll().subscribe((res) => {

      this.locations = res.data;

      if (this.locations.length) {

        this.selectedLocationId = this.locations[0]._id;

        this.onLocationChange();

      }

    });

  }



  onLocationChange(): void {

    this.loadedWeekKey = '';

    this.selectedLocation = this.locations.find((l) => l._id === this.selectedLocationId) || null;

    this.applyScheduleStartDay();

    this.applyLocationHours();

    this.loadSchedule();

  }



  applyScheduleStartDay(): void {

    const firstDay = scheduleStartDayToFirstDay(this.scheduleStartDay);

    const api = this.calendarComponent?.getApi();

    if (api) {

      api.setOption('firstDay', firstDay);

    } else {

      this.calendarOptions = { ...this.calendarOptions, firstDay };

    }

  }



  applyLocationHours(): void {

    if (!this.selectedLocation) return;



    const hours = this.selectedLocation.operatingHours;

    const bounds = getCalendarTimeBounds(hours);

    const businessHours = toFullCalendarBusinessHours(hours);

    const hiddenDays = getHiddenDays(hours);
    this.hoursSummary = formatHoursSummary(hours);

    const api = this.calendarComponent?.getApi();
    if (api) {
      api.setOption('slotMinTime', bounds.slotMinTime);
      api.setOption('slotMaxTime', bounds.slotMaxTime);
      api.setOption('businessHours', businessHours);
      if (hiddenDays.length) {
        api.setOption('hiddenDays', hiddenDays);
      } else {
        api.setOption('hiddenDays', []);
      }

    } else {

      this.calendarOptions = {

        ...this.calendarOptions,

        ...bounds,

        businessHours,

        hiddenDays: hiddenDays.length ? hiddenDays : undefined,

      };

    }

  }



  loadSchedule(anchorDate?: Date): void {

    if (!this.selectedLocationId) return;

    const date = anchorDate

      || this.calendarComponent?.getApi()?.getDate()

      || new Date();

    this.scheduleService.getWeek({

      locationId: this.selectedLocationId,

      date: date.toISOString(),

    }).subscribe({

      next: (res) => {

        this.shifts = res.data.shifts;

        this.weekStart = res.data.weekStart;

        this.weekEnd = res.data.weekEnd;

        if (res.data.scheduleStartDay) {

          this.scheduleStartDay = res.data.scheduleStartDay;

          this.applyScheduleStartDay();

        }

        const schedules = (res.data as { schedules?: Schedule[] }).schedules || [];

        const rawScheduleId = schedules[0]?._id || this.shifts[0]?.scheduleId;

        this.currentScheduleId = typeof rawScheduleId === 'string'

          ? rawScheduleId

          : (rawScheduleId && typeof rawScheduleId === 'object' && '_id' in rawScheduleId)

            ? String((rawScheduleId as { _id: string })._id)

            : '';

        this.loadedWeekKey = this.buildWeekCacheKey(this.weekStart);

        if (res.data.location) {

          this.selectedLocation = res.data.location as Location;

          setTimeout(() => this.applyLocationHours());

        }

        const events = this.shifts.map((s) => this.shiftToEvent(s));

        this.buildEmployeeHours();

        this.syncCalendarEvents(events);

        this.cdr.markForCheck();

      },

      error: (err) => alert(err.error?.message || 'Failed to load schedule'),

    });

  }



  private buildWeekCacheKey(weekStart: string): string {

    return `${this.selectedLocationId}-${formatLocalDate(new Date(weekStart))}`;

  }



  private syncCalendarEvents(events: EventInput[]): void {

    this.calendarOptions = { ...this.calendarOptions, events };

  }



  private reloadSchedule(): void {

    this.loadedWeekKey = '';

    const anchor = this.calendarComponent?.getApi()?.getDate() || new Date();

    this.loadSchedule(anchor);

  }



  private shiftToEvent(shift: Shift) {

    const emp = typeof shift.employeeId === 'object' ? shift.employeeId : null;

    const empName = shift.isOpenShift

      ? 'Open Shift'

      : employeeDisplayName(emp, shift.userId);

    const bg = shift.isOpenShift ? '#fff7e6' : '#e8f1fb';
    const border = shift.isOpenShift ? '#d99a2b' : '#5b8fc9';

    return {

      id: shift._id,

      title: empName,

      start: `${shift.date.split('T')[0]}T${shift.startTime}`,

      end: `${shift.date.split('T')[0]}T${shift.endTime}`,

      backgroundColor: bg,

      borderColor: border,

      textColor: '#163a5f',

      extendedProps: { shift },

    };

  }



  private renderEventContent(info: EventContentArg): { domNodes: Node[] } {
    const shift = info.event.extendedProps['shift'] as Shift;
    const employee = typeof shift.employeeId === 'object' ? shift.employeeId : null;
    const name = shift.isOpenShift ? 'Open' : employeeDisplayName(employee, shift.userId);
    const initials = shift.isOpenShift
      ? 'OS'
      : name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

    const wrapper = document.createElement('div');
    wrapper.className = 'compact-shift';
    const indicator = document.createElement('span');
    indicator.className = 'employee-indicator';
    indicator.textContent = initials || '?';
    const details = document.createElement('span');
    details.className = 'shift-details';
    const employeeName = document.createElement('div');
    employeeName.className = 'shift-employee';
    employeeName.textContent = name;
    const time = document.createElement('div');
    time.className = 'shift-time';
    time.textContent = `${format12Hour(shift.startTime)}–${format12Hour(shift.endTime)}`;
    details.append(employeeName, time);
    wrapper.append(indicator, details);
    return { domNodes: [wrapper] };
  }



  private buildEmployeeHours(): void {

    const totals = new Map<string, { id: string; name: string; shiftCount: number; hours: number }>();

    for (const shift of this.shifts) {

      if (shift.isOpenShift) continue;

      const employee = typeof shift.employeeId === 'object' ? shift.employeeId : null;
      const id = typeof shift.employeeId === 'object' ? shift.employeeId?._id : shift.employeeId;
      if (!id) continue;
      const current = totals.get(id) || {
        id,
        name: employeeDisplayName(employee, shift.userId),
        shiftCount: 0,
        hours: 0,
      };
      current.shiftCount += 1;
      current.hours += shift.totalHours ?? this.calculateShiftHours(shift);
      totals.set(id, current);

    }

    this.weeklyEmployeeHours = [...totals.values()]
      .map((employee) => ({ ...employee, hours: Math.round(employee.hours * 100) / 100 }))
      .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));

  }



  private calculateShiftHours(shift: Shift): number {

    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const minutes = toMinutes(shift.endTime) - toMinutes(shift.startTime) - (shift.breakLength || 0);
    return Math.max(0, minutes / 60);

  }



  onDatesSet(info: { start: Date }): void {

    if (!this.selectedLocationId) return;

    if (!this.weekStart || !this.weekEnd) {

      this.loadSchedule(info.start);

      return;

    }

    const viewStart = info.start.getTime();

    const weekStart = new Date(this.weekStart).getTime();

    const weekEnd = new Date(this.weekEnd).getTime();

    if (viewStart >= weekStart && viewStart <= weekEnd) return;

    this.loadSchedule(info.start);

  }



  clearSchedule(): void {

    if (!confirm('Remove all shifts for this week at this location?')) return;

    const date = (this.calendarComponent?.getApi()?.getDate() || new Date()).toISOString();

    const params: Record<string, string> = {
      date,
      locationId: this.selectedLocationId,
    };

    this.scheduleService.clearSchedule(params).subscribe({

      next: () => this.reloadSchedule(),

      error: (err) => alert(err.error?.message || 'Failed to clear schedule'),

    });

  }



  changeView(view: string): void {

    this.currentView = view;

    this.calendarComponent?.getApi()?.changeView(view);

  }



  openAddShift(): void {

    const anchor = this.calendarComponent?.getApi()?.getDate() || new Date();

    this.openShiftDialog(formatLocalDate(anchor), '09:00', '17:00', true);

  }



  onEventClick(info: EventClickArg): void {

    const shift = info.event.extendedProps['shift'] as Shift;

    this.dialog.open(ShiftDialogComponent, {

      width: '420px',

      data: {

        locationId: this.selectedLocationId,

        date: shift.date.split('T')[0],

        startTime: shift.startTime,

        endTime: shift.endTime,

        shift,

        operatingHours: this.selectedLocation?.operatingHours,

        existingShifts: this.shifts,

      },

    }).afterClosed().subscribe((saved) => { if (saved) this.reloadSchedule(); });

  }



  onDateSelect(info: DateSelectArg): void {

    this.openShiftDialog(formatLocalDate(info.start), formatTime(info.start), formatTime(info.end));

    info.view.calendar.unselect();

  }



  private openShiftDialog(
    date: string,
    startTime: string,
    endTime: string,
    useNextAvailable = false
  ): void {

    this.dialog.open(ShiftDialogComponent, {

      width: '420px',

      data: {
        locationId: this.selectedLocationId,
        date,
        startTime,
        endTime,
        operatingHours: this.selectedLocation?.operatingHours,
        existingShifts: this.shifts,
        useNextAvailable,
      },

    }).afterClosed().subscribe((saved) => { if (saved) this.reloadSchedule(); });

  }



  onEventDrop(info: EventDropArg): void {

    const shift = info.event.extendedProps['shift'] as Shift;

    if (!info.event.start || !info.event.end) return;



    this.scheduleService.updateShift(shift._id, {

      date: formatLocalDate(info.event.start),

      startTime: formatTime(info.event.start),

      endTime: formatTime(info.event.end),

    }).subscribe({

      next: () => this.reloadSchedule(),

      error: () => info.revert(),

    });

  }



  publishSchedule(): void {

    if (!this.currentScheduleId) return;

    this.scheduleService.publish(this.currentScheduleId).subscribe(() => this.reloadSchedule());

  }



  copyPreviousWeek(): void {

    if (!this.selectedLocationId || !this.weekStart) return;

    const overwrite = this.shifts.length > 0;
    const message = overwrite
      ? 'Replace all shifts in the displayed week with last week’s schedule?'
      : 'Copy last week’s shifts into the displayed week?';
    if (!confirm(message)) return;

    this.scheduleService.copyPreviousWeek(this.selectedLocationId, this.weekStart, overwrite)
      .subscribe({
        next: (res) => {
          alert(`${res.data.shiftsCopied} shifts copied from last week.`);
          this.reloadSchedule();
        },
        error: (err) => alert(err.error?.message || 'Failed to copy last week’s schedule'),
      });

  }



  exportExcel(): void {

    if (!this.shifts.length) return;

    const escapeXml = (value: string | number) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const weekStart = new Date(`${this.weekStart.split('T')[0]}T12:00:00`);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const key = formatLocalDate(date);
      const shifts = this.shifts
        .filter((shift) => shift.date.split('T')[0] === key)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      return { date, shifts };
    });
    const maxShifts = Math.max(1, ...days.map((day) => day.shifts.length));
    const title = `${this.selectedLocation?.name || 'Schedule'} — ${weekStart.toLocaleDateString()} to ${days[6].date.toLocaleDateString()}`;

    const scheduleRows = Array.from({ length: maxShifts }, (_, rowIndex) =>
      `<Row ss:Height="52">${days.map((day) => {
        const shift = day.shifts[rowIndex];
        if (!shift) return '<Cell ss:StyleID="Empty"><Data ss:Type="String"></Data></Cell>';
        const employee = typeof shift.employeeId === 'object' ? shift.employeeId : null;
        const name = shift.isOpenShift ? 'Open Shift' : employeeDisplayName(employee, shift.userId);
        const hours = shift.totalHours ?? this.calculateShiftHours(shift);
        const text = `${name}\n${format12Hour(shift.startTime)} – ${format12Hour(shift.endTime)}\n${hours} hours`;
        return `<Cell ss:StyleID="Shift"><Data ss:Type="String">${escapeXml(text)}</Data></Cell>`;
      }).join('')}</Row>`
    ).join('');

    const scheduleSheet = `
      <Worksheet ss:Name="Weekly Schedule">
        <Table>
          ${days.map(() => '<Column ss:Width="112"/>').join('')}
          <Row ss:Height="28">
            <Cell ss:StyleID="Title" ss:MergeAcross="6"><Data ss:Type="String">${escapeXml(title)}</Data></Cell>
          </Row>
          <Row ss:Height="32">
            ${days.map((day) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${
              escapeXml(day.date.toLocaleDateString(undefined, {
                weekday: 'long', month: 'short', day: 'numeric',
              }))
            }</Data></Cell>`).join('')}
          </Row>
          ${scheduleRows}
        </Table>
        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
          <FreezePanes/><FrozenNoSplit/><SplitHorizontal>2</SplitHorizontal><TopRowBottomPane>2</TopRowBottomPane>
          <PageSetup><Layout x:Orientation="Landscape"/></PageSetup>
          <FitToPage/>
        </WorksheetOptions>
      </Worksheet>`;

    const hoursRows = this.weeklyEmployeeHours.map((employee) => `
      <Row>
        <Cell ss:StyleID="Body"><Data ss:Type="String">${escapeXml(employee.name)}</Data></Cell>
        <Cell ss:StyleID="BodyCenter"><Data ss:Type="Number">${employee.shiftCount}</Data></Cell>
        <Cell ss:StyleID="Hours"><Data ss:Type="Number">${employee.hours}</Data></Cell>
      </Row>`).join('');
    const hoursSheet = `
      <Worksheet ss:Name="Employee Hours">
        <Table>
          <Column ss:Width="180"/><Column ss:Width="70"/><Column ss:Width="70"/>
          <Row ss:Height="28">
            <Cell ss:StyleID="Title" ss:MergeAcross="2"><Data ss:Type="String">Employee Hours — Most to Least</Data></Cell>
          </Row>
          <Row>
            <Cell ss:StyleID="Header"><Data ss:Type="String">Employee</Data></Cell>
            <Cell ss:StyleID="Header"><Data ss:Type="String">Shifts</Data></Cell>
            <Cell ss:StyleID="Header"><Data ss:Type="String">Hours</Data></Cell>
          </Row>
          ${hoursRows}
        </Table>
        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
          <FreezePanes/><FrozenNoSplit/><SplitHorizontal>2</SplitHorizontal><TopRowBottomPane>2</TopRowBottomPane>
        </WorksheetOptions>
      </Worksheet>`;

    const workbook = `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:x="urn:schemas-microsoft-com:office:excel">
        <Styles>
          <Style ss:ID="Default" ss:Name="Normal">
            <Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="10"/>
          </Style>
          <Style ss:ID="Title">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#174A75"/>
            <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#5B8FC9"/></Borders>
          </Style>
          <Style ss:ID="Header">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
            <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#174A75"/>
            <Interior ss:Color="#EAF2F9" ss:Pattern="Solid"/>
            <Borders>
              <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#AAB8C5"/>
              <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#AAB8C5"/>
              <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#AAB8C5"/>
              <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#AAB8C5"/>
            </Borders>
          </Style>
          <Style ss:ID="Shift">
            <Alignment ss:Vertical="Top" ss:WrapText="1"/>
            <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#243B53"/>
            <Interior ss:Color="#F8FBFE" ss:Pattern="Solid"/>
            <Borders>
              <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C5D0DA"/>
              <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#5B8FC9"/>
              <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C5D0DA"/>
              <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C5D0DA"/>
            </Borders>
          </Style>
          <Style ss:ID="Empty">
            <Borders>
              <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E7"/>
              <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E7"/>
              <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E7"/>
              <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E7"/>
            </Borders>
          </Style>
          <Style ss:ID="Body"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E7"/></Borders></Style>
          <Style ss:ID="BodyCenter"><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E7"/></Borders></Style>
          <Style ss:ID="Hours"><Alignment ss:Horizontal="Right"/><NumberFormat ss:Format="0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E7"/></Borders></Style>
        </Styles>
        ${scheduleSheet}
        ${hoursSheet}
      </Workbook>`;

    const location = (this.selectedLocation?.name || 'location').replace(/[^\w-]+/g, '-');
    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${location}-${this.weekStart.split('T')[0]}-schedule.xls`;
    link.click();
    URL.revokeObjectURL(url);

  }



  exportPDF(): void {

    if (!this.currentScheduleId) return;

    this.scheduleService.exportPDF(this.currentScheduleId).subscribe((blob) => {

      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');

      a.href = url;

      a.download = 'schedule.pdf';

      a.click();

    });

  }

}


