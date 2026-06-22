import { Component, inject, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';

import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { MatSelectModule } from '@angular/material/select';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatMenuModule } from '@angular/material/menu';

import { MatDialog } from '@angular/material/dialog';

import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';

import { CalendarOptions, EventClickArg, EventDropArg, DateSelectArg, EventInput } from '@fullcalendar/core';

import dayGridPlugin from '@fullcalendar/daygrid';

import timeGridPlugin from '@fullcalendar/timegrid';

import interactionPlugin from '@fullcalendar/interaction';

import { ScheduleService, LocationService } from '../../core/services';

import { AuthService } from '../../core/services/auth.service';

import { Shift, Location, Schedule, employeeDisplayName } from '../../core/models';

import {

  toFullCalendarBusinessHours, getCalendarTimeBounds, getHiddenDays, formatHoursSummary,

} from '../../core/utils/operating-hours';

import { employeeColor, isLightColor } from '../../core/utils/employee-colors';

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



@Component({

  selector: 'sb-schedule',

  standalone: true,

  imports: [

    RouterLink, MatButtonModule, MatIconModule, MatSelectModule,

    MatFormFieldModule, MatMenuModule, FullCalendarModule,

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

            <button mat-menu-item (click)="copyPreviousWeek()" [disabled]="!currentScheduleId">

              <mat-icon>content_copy</mat-icon> Copy Previous Week

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



        @if (legend.length) {

          <div class="shift-legend">

            @for (item of legend; track item.id) {

              <span class="legend-item">

                <span class="legend-dot" [style.background]="item.color"></span>

                {{ item.name }}

              </span>

            }

            <span class="legend-item">

              <span class="legend-dot open-shift"></span>

              Open Shift

            </span>

          </div>

        }



        <div class="sb-card calendar-container">

          <full-calendar #calendar [options]="calendarOptions" />

        </div>

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

    .calendar-container { padding: 0; overflow: hidden; }

    .shift-legend {

      display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;

      .legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; }

      .legend-dot { width: 12px; height: 12px; border-radius: 3px; }

      .legend-dot.open-shift { background: #f59e0b; }

    }

    .empty-state {

      text-align: center; padding: 48px 24px;

      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--sb-text-secondary); }

      p { color: var(--sb-text-secondary); margin: 16px 0; }

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

  legend: { id: string; name: string; color: string }[] = [];

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

    allDaySlot: false,

    height: 'auto',

    nowIndicator: true,

    businessHours: true,

    selectConstraint: 'businessHours',

    eventConstraint: 'businessHours',

    events: [],

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

        this.buildLegend();

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

    const empId = shift.isOpenShift
      ? null
      : (typeof shift.employeeId === 'object' ? shift.employeeId?._id : shift.employeeId);

    const bg = shift.isOpenShift ? '#f59e0b' : employeeColor(empId);

    return {

      id: shift._id,

      title: `${empName} (${shift.startTime}–${shift.endTime})`,

      start: `${shift.date.split('T')[0]}T${shift.startTime}`,

      end: `${shift.date.split('T')[0]}T${shift.endTime}`,

      backgroundColor: bg,

      borderColor: bg,

      textColor: isLightColor(bg) ? '#1a1a1a' : '#ffffff',

      extendedProps: { shift },

    };

  }



  private buildLegend(): void {

    const seen = new Map<string, { id: string; name: string; color: string }>();

    for (const shift of this.shifts) {

      if (shift.isOpenShift) continue;

      const emp = typeof shift.employeeId === 'object' ? shift.employeeId : null;

      const id = typeof shift.employeeId === 'object' ? shift.employeeId?._id : shift.employeeId;

      if (!id || seen.has(id)) continue;

      seen.set(id, {

        id,

        name: employeeDisplayName(emp, shift.userId),

        color: employeeColor(id),

      });

    }

    this.legend = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));

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

    this.openShiftDialog(formatLocalDate(anchor), '09:00', '17:00');

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

      },

    }).afterClosed().subscribe((saved) => { if (saved) this.reloadSchedule(); });

  }



  onDateSelect(info: DateSelectArg): void {

    this.openShiftDialog(formatLocalDate(info.start), formatTime(info.start), formatTime(info.end));

    info.view.calendar.unselect();

  }



  private openShiftDialog(date: string, startTime: string, endTime: string): void {

    this.dialog.open(ShiftDialogComponent, {

      width: '420px',

      data: { locationId: this.selectedLocationId, date, startTime, endTime },

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

    if (!this.currentScheduleId) return;

    const nextWeek = new Date();

    nextWeek.setDate(nextWeek.getDate() + 7);

    this.scheduleService.copyPreviousWeek(this.currentScheduleId, nextWeek.toISOString())

      .subscribe(() => this.reloadSchedule());

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


