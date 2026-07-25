import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin } from 'rxjs';
import { EmployeeService, ScheduleService } from '../../core/services';
import { EmployeeProfile, Shift, employeeDisplayName } from '../../core/models';
import { employeeColor } from '../../core/utils/employee-colors';
import {
  DEFAULT_OPERATING_HOURS,
  OperatingHours,
} from '../../core/utils/operating-hours';

export interface ShiftDialogWeekDay {
  date: string;
  label: string;
}

export interface ShiftDialogData {
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  shift?: Shift;
  operatingHours?: OperatingHours;
  existingShifts?: Shift[];
  useNextAvailable?: boolean;
  /** Days in the displayed week — used for copy-to-days. */
  weekDays?: ShiftDialogWeekDay[];
}

export type ShiftDialogResult =
  | { action: 'saved'; shift: Shift; copiedShifts?: Shift[] }
  | { action: 'copied'; shifts: Shift[] }
  | { action: 'deleted'; shiftId: string };

@Component({
  selector: 'sb-shift-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatSelectModule, MatCheckboxModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.shift ? 'Edit Shift' : 'Add Shift' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="shift-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date">
        </mat-form-field>
        <div class="time-row">
          <mat-form-field appearance="outline">
            <mat-label>Start</mat-label>
            <mat-select formControlName="startTime">
              @for (option of startOptions; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>End</mat-label>
            <mat-select formControlName="endTime">
              @for (option of endOptions; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        @if (dayHoursLabel) {
          <p class="hours-note">Store hours: {{ dayHoursLabel }}</p>
        }
        @if (!form.value.isOpenShift) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Employee</mat-label>
            <mat-select formControlName="employeeId">
              @for (emp of employees; track emp._id) {
                <mat-option [value]="emp._id">
                  <span class="emp-option">
                    <span class="color-dot" [style.background]="employeeColor(emp._id)"></span>
                    {{ displayName(emp) }}
                  </span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <mat-checkbox formControlName="isOpenShift">Open shift (unassigned)</mat-checkbox>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <input matInput formControlName="notes">
        </mat-form-field>

        @if (copyTargets.length) {
          <div class="copy-section">
            <span class="copy-label">Copy this shift to</span>
            <p class="copy-hint">Same employee, times, and notes on the days you select.</p>
            <div class="copy-days">
              @for (day of copyTargets; track day.date) {
                <mat-checkbox
                  [checked]="copyDates.has(day.date)"
                  (change)="toggleCopyDate(day.date, $event.checked)">
                  {{ day.label }}
                </mat-checkbox>
              }
            </div>
          </div>
        }
      </form>
      @if (error) {
        <p class="error">{{ error }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.shift) {
        <button mat-button color="warn" (click)="deleteShift()" [disabled]="saving">Delete</button>
      }
      <button mat-button mat-dialog-close [disabled]="saving">Cancel</button>
      @if (copyTargets.length) {
        <button mat-stroked-button color="primary"
                [disabled]="form.invalid || saving || copyDates.size === 0"
                (click)="copyToSelectedDays()">
          @if (saving && copying) { Copying… } @else { Copy to selected days }
        </button>
      }
      <button mat-flat-button color="primary" [disabled]="form.invalid || saving" (click)="save()">
        @if (saving && !copying) { Saving… } @else { Save Shift }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .shift-form { display: flex; flex-direction: column; gap: 4px; min-width: 340px; }
    .full-width { width: 100%; }
    .time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .error { color: var(--sb-error, #c62828); font-size: 0.875rem; margin-top: 8px; }
    .hours-note { margin: -8px 0 8px; color: var(--sb-text-secondary); font-size: 0.8rem; }
    .emp-option { display: inline-flex; align-items: center; gap: 8px; }
    .color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .copy-section {
      margin-top: 8px; padding: 12px; border: 1px solid #d8e3ef; border-radius: 8px;
      background: #f8fbfe;
    }
    .copy-label { display: block; font-weight: 600; color: #24496d; font-size: 0.875rem; }
    .copy-hint { margin: 4px 0 10px; color: var(--sb-text-secondary); font-size: 0.78rem; line-height: 1.4; }
    .copy-days { display: grid; gap: 2px; }
    mat-dialog-actions { flex-wrap: wrap; gap: 4px; }
  `],
})
export class ShiftDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private scheduleService = inject(ScheduleService);
  private dialogRef = inject(MatDialogRef<ShiftDialogComponent>);
  data = inject<ShiftDialogData>(MAT_DIALOG_DATA);

  employees: EmployeeProfile[] = [];
  startOptions: { value: string; label: string }[] = [];
  endOptions: { value: string; label: string }[] = [];
  dayHoursLabel = '';
  saving = false;
  copying = false;
  error = '';
  copyDates = new Set<string>();
  copyTargets: ShiftDialogWeekDay[] = [];

  form = this.fb.group({
    date: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    employeeId: [''],
    isOpenShift: [false],
    notes: [''],
  });

  ngOnInit(): void {
    const shift = this.data.shift;
    this.form.patchValue({
      date: shift ? shift.date.split('T')[0] : this.data.date,
      startTime: shift?.startTime || this.data.startTime,
      endTime: shift?.endTime || this.data.endTime,
      employeeId: typeof shift?.employeeId === 'object' ? shift.employeeId._id : shift?.employeeId || '',
      isOpenShift: shift?.isOpenShift || false,
      notes: shift?.notes || '',
    });
    this.refreshTimeOptions(!shift && !!this.data.useNextAvailable);
    this.refreshCopyTargets();

    this.employeeService.getAll().subscribe((res) => {
      this.employees = res.data.filter((e) => this.isSchedulableAtLocation(e));
    });

    this.form.get('isOpenShift')?.valueChanges.subscribe((open) => {
      const empCtrl = this.form.get('employeeId');
      if (open) {
        empCtrl?.clearValidators();
        empCtrl?.setValue('');
      } else {
        empCtrl?.setValidators(Validators.required);
      }
      empCtrl?.updateValueAndValidity();
    });

    if (!shift?.isOpenShift) {
      this.form.get('employeeId')?.setValidators(Validators.required);
    }

    this.form.get('date')?.valueChanges.subscribe(() => {
      this.refreshTimeOptions(!this.data.shift);
      this.refreshCopyTargets();
    });
    this.form.get('startTime')?.valueChanges.subscribe(() => {
      this.refreshEndOptions();
      this.validateTimeRange();
    });
    this.form.get('endTime')?.valueChanges.subscribe(() => this.validateTimeRange());
  }

  toggleCopyDate(date: string, checked: boolean): void {
    if (checked) this.copyDates.add(date);
    else this.copyDates.delete(date);
  }

  private refreshCopyTargets(): void {
    const sourceDate = this.form.get('date')?.value || this.data.date;
    this.copyTargets = (this.data.weekDays || []).filter((day) => day.date !== sourceDate);
    this.copyDates.delete(sourceDate);
    for (const date of [...this.copyDates]) {
      if (!this.copyTargets.some((day) => day.date === date)) this.copyDates.delete(date);
    }
  }

  private buildShiftPayload(date: string) {
    const v = this.form.getRawValue();
    return {
      locationId: this.data.locationId,
      date,
      startTime: v.startTime!,
      endTime: v.endTime!,
      employeeId: v.isOpenShift ? undefined : v.employeeId || undefined,
      isOpenShift: !!v.isOpenShift,
      notes: v.notes || undefined,
    };
  }

  private createShiftsOnDates(dates: string[]) {
    return forkJoin(dates.map((date) => this.scheduleService.createShift(this.buildShiftPayload(date))));
  }

  private refreshTimeOptions(useNextAvailable: boolean): void {
    const date = this.form.get('date')?.value || this.data.date;
    const hours = this.hoursForDate(date);
    if (hours.closed) {
      this.startOptions = [];
      this.endOptions = [];
      this.dayHoursLabel = 'Closed';
      this.form.patchValue({ startTime: '', endTime: '' }, { emitEvent: false });
      return;
    }

    this.dayHoursLabel = `${this.formatTimeLabel(hours.open)} – ${this.formatTimeLabel(hours.close)}`;
    this.startOptions = this.buildTimeOptions(hours.open, hours.close, false);

    let start = this.form.get('startTime')?.value || hours.open;
    if (useNextAvailable) start = this.nextAvailableStart(date, hours.open, hours.close);
    if (!this.startOptions.some((option) => option.value === start)) start = hours.open;

    const currentEnd = this.form.get('endTime')?.value || '';
    this.form.patchValue({ startTime: start }, { emitEvent: false });
    this.refreshEndOptions();
    const defaultEnd = this.defaultEndTime(start, hours.close);
    const end = this.endOptions.some((option) => option.value === currentEnd) ? currentEnd : defaultEnd;
    this.form.patchValue({ endTime: end }, { emitEvent: false });
    this.validateTimeRange();
  }

  private refreshEndOptions(): void {
    const date = this.form.get('date')?.value || this.data.date;
    const hours = this.hoursForDate(date);
    const start = this.form.get('startTime')?.value;
    if (hours.closed || !start) {
      this.endOptions = [];
      return;
    }
    this.endOptions = this.buildTimeOptions(start, hours.close, true)
      .filter((option) => this.timeToMinutes(option.value) > this.timeToMinutes(start));
    const end = this.form.get('endTime')?.value;
    if (end && !this.endOptions.some((option) => option.value === end)) {
      this.form.patchValue(
        { endTime: this.defaultEndTime(start, hours.close) },
        { emitEvent: false }
      );
    }
  }

  private hoursForDate(date: string): { open: string; close: string; closed: boolean } {
    const parsed = new Date(`${date}T12:00:00`);
    const dayKeys: (keyof OperatingHours)[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ];
    const key = dayKeys[parsed.getDay()];
    return this.data.operatingHours?.[key] || DEFAULT_OPERATING_HOURS[key];
  }

  private buildTimeOptions(
    start: string,
    end: string,
    includeEnd: boolean
  ): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);
    for (let minutes = startMinutes; includeEnd ? minutes <= endMinutes : minutes < endMinutes; minutes += 30) {
      const value = this.minutesToTime(minutes);
      options.push({ value, label: this.formatTimeLabel(value) });
    }
    if (includeEnd && options.at(-1)?.value !== end) {
      options.push({ value: end, label: this.formatTimeLabel(end) });
    }
    return options;
  }

  private nextAvailableStart(date: string, open: string, close: string): string {
    let cursor = this.timeToMinutes(open);
    const closeMinutes = this.timeToMinutes(close);
    const shifts = (this.data.existingShifts || [])
      .filter((shift) => shift.date.split('T')[0] === date && shift._id !== this.data.shift?._id)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (const shift of shifts) {
      const shiftStart = this.timeToMinutes(shift.startTime);
      const shiftEnd = this.timeToMinutes(shift.endTime);
      if (shiftStart <= cursor && shiftEnd > cursor) cursor = shiftEnd;
    }
    return this.minutesToTime(Math.min(cursor, Math.max(this.timeToMinutes(open), closeMinutes - 30)));
  }

  private defaultEndTime(start: string, close: string): string {
    return this.minutesToTime(Math.min(this.timeToMinutes(start) + 4 * 60, this.timeToMinutes(close)));
  }

  private validateTimeRange(): void {
    const start = this.form.get('startTime')?.value;
    const endControl = this.form.get('endTime');
    const end = endControl?.value;
    if (start && end && this.timeToMinutes(end) <= this.timeToMinutes(start)) {
      endControl?.setErrors({ timeRange: true });
    } else if (endControl?.hasError('timeRange')) {
      endControl.setErrors(null);
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private formatTimeLabel(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 || 12;
    return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  displayName(emp: EmployeeProfile): string {
    const name = employeeDisplayName(emp, emp.userId);
    const role = typeof emp.userId === 'object' ? emp.userId?.role : null;
    if (role === 'owner') return `${name} (Owner)`;
    if (role === 'manager') return `${name} (Manager)`;
    return name;
  }

  employeeColor(id: string): string {
    return employeeColor(id);
  }

  /** Active employees at this location, or with no location restriction (e.g. owner) */
  private isSchedulableAtLocation(e: EmployeeProfile): boolean {
    if (e.employmentStatus !== 'active') return false;
    if (!e.availableLocationIds?.length) return true;
    return e.availableLocationIds.some((l) => l._id === this.data.locationId);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.copying = false;
    this.error = '';

    const sourceDate = this.form.get('date')?.value!;
    const payload = this.buildShiftPayload(sourceDate);
    const copyDates = [...this.copyDates];

    const req = this.data.shift
      ? this.scheduleService.updateShift(this.data.shift._id, payload)
      : this.scheduleService.createShift(payload);

    req.subscribe({
      next: (res) => {
        if (!copyDates.length) {
          this.dialogRef.close({ action: 'saved', shift: res.data } satisfies ShiftDialogResult);
          return;
        }
        this.copying = true;
        this.createShiftsOnDates(copyDates).subscribe({
          next: (responses) => this.dialogRef.close({
            action: 'saved',
            shift: res.data,
            copiedShifts: responses.map((response) => response.data),
          } satisfies ShiftDialogResult),
          error: (err) => {
            this.saving = false;
            this.copying = false;
            this.error = err.error?.message
              || 'Shift saved, but copying to other days failed';
          },
        });
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || 'Failed to save shift';
      },
    });
  }

  copyToSelectedDays(): void {
    if (this.form.invalid || this.copyDates.size === 0) return;
    this.saving = true;
    this.copying = true;
    this.error = '';

    this.createShiftsOnDates([...this.copyDates]).subscribe({
      next: (responses) => this.dialogRef.close({
        action: 'copied',
        shifts: responses.map((response) => response.data),
      } satisfies ShiftDialogResult),
      error: (err) => {
        this.saving = false;
        this.copying = false;
        this.error = err.error?.message || 'Failed to copy shift';
      },
    });
  }

  deleteShift(): void {
    if (!this.data.shift || !confirm('Delete this shift?')) return;
    this.saving = true;
    this.scheduleService.deleteShift(this.data.shift._id).subscribe({
      next: () => this.dialogRef.close({
        action: 'deleted',
        shiftId: this.data.shift!._id,
      } satisfies ShiftDialogResult),
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || 'Failed to delete shift';
      },
    });
  }
}
