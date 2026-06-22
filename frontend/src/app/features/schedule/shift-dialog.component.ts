import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EmployeeService, ScheduleService } from '../../core/services';
import { EmployeeProfile, Shift, employeeDisplayName } from '../../core/models';
import { employeeColor } from '../../core/utils/employee-colors';

export interface ShiftDialogData {
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  shift?: Shift;
}

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
            <input matInput type="time" formControlName="startTime">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>End</mat-label>
            <input matInput type="time" formControlName="endTime">
          </mat-form-field>
        </div>
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
      <button mat-flat-button color="primary" [disabled]="form.invalid || saving" (click)="save()">
        @if (saving) { Saving… } @else { Save Shift }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .shift-form { display: flex; flex-direction: column; gap: 4px; min-width: 340px; }
    .full-width { width: 100%; }
    .time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .error { color: var(--sb-error, #c62828); font-size: 0.875rem; margin-top: 8px; }
    .emp-option { display: inline-flex; align-items: center; gap: 8px; }
    .color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  `],
})
export class ShiftDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private scheduleService = inject(ScheduleService);
  private dialogRef = inject(MatDialogRef<ShiftDialogComponent>);
  data = inject<ShiftDialogData>(MAT_DIALOG_DATA);

  employees: EmployeeProfile[] = [];
  saving = false;
  error = '';

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
    this.error = '';

    const v = this.form.getRawValue();
    const payload = {
      locationId: this.data.locationId,
      date: v.date,
      startTime: v.startTime,
      endTime: v.endTime,
      employeeId: v.isOpenShift ? undefined : v.employeeId,
      isOpenShift: v.isOpenShift,
      notes: v.notes || undefined,
    };

    const req = this.data.shift
      ? this.scheduleService.updateShift(this.data.shift._id, payload)
      : this.scheduleService.createShift(payload);

    req.subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || 'Failed to save shift';
      },
    });
  }

  deleteShift(): void {
    if (!this.data.shift || !confirm('Delete this shift?')) return;
    this.saving = true;
    this.scheduleService.deleteShift(this.data.shift._id).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || 'Failed to delete shift';
      },
    });
  }
}
