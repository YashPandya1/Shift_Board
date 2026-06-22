import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { EmployeeService, LocationService } from '../../core/services';
import { EmployeeProfile, Location } from '../../core/models';

export interface EmployeeDialogData {
  hourlyWageEnabled: boolean;
  employee?: EmployeeProfile;
}

@Component({
  selector: 'sb-employee-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Employee' : 'Add Employee' }}</h2>
    <mat-dialog-content>
      @if (!isEdit) {
        <p class="hint">Staff records are for scheduling only — they do not get app login access.</p>
      }
      <form [formGroup]="form" class="employee-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="Full name" required>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Phone Number</mat-label>
          <input matInput formControlName="phone" placeholder="e.g. 416-555-0100" required>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Position</mat-label>
          <input matInput formControlName="position" placeholder="e.g. Cashier, Server (optional)">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Locations</mat-label>
          <mat-select formControlName="availableLocationIds" multiple required>
            @for (loc of locations; track loc._id) {
              <mat-option [value]="loc._id">{{ loc.name }}</mat-option>
            }
          </mat-select>
          @if (!locations.length) {
            <mat-hint>Add a location first under Locations</mat-hint>
          }
        </mat-form-field>
        @if (data.hourlyWageEnabled) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Hourly Wage</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" step="0.01" min="0" formControlName="hourlyWage">
          </mat-form-field>
        }
      </form>
      @if (error) {
        <p class="error">{{ error }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || saving || !locations.length" (click)="save()">
        @if (saving) { Saving… } @else { {{ isEdit ? 'Save Changes' : 'Add Employee' }} }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { color: var(--sb-text-secondary); font-size: 0.875rem; margin: 0 0 16px; }
    .employee-form { display: flex; flex-direction: column; gap: 4px; min-width: 360px; }
    .full-width { width: 100%; }
    .error { color: var(--sb-error, #c62828); font-size: 0.875rem; margin: 8px 0 0; }
  `],
})
export class EmployeeDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private locationService = inject(LocationService);
  private dialogRef = inject(MatDialogRef<EmployeeDialogComponent>);
  data = inject<EmployeeDialogData>(MAT_DIALOG_DATA);

  locations: Location[] = [];
  saving = false;
  error = '';
  isEdit = false;

  form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    position: [''],
    hourlyWage: [null as number | null],
    availableLocationIds: [[] as string[], Validators.required],
  });

  ngOnInit(): void {
    this.isEdit = !!this.data.employee;

    this.locationService.getAll().subscribe((res) => {
      this.locations = res.data;
    });

    if (this.data.employee) {
      const emp = this.data.employee;
      const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim()
        || (emp.userId && typeof emp.userId === 'object'
          ? `${emp.userId.firstName} ${emp.userId.lastName}`.trim()
          : '');

      this.form.patchValue({
        name: fullName,
        phone: emp.phone || '',
        position: emp.position || '',
        hourlyWage: emp.hourlyWage ?? null,
        availableLocationIds: emp.availableLocationIds?.map((l) => l._id) || [],
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';

    const value = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      name: value.name,
      phone: value.phone,
      position: value.position || undefined,
      availableLocationIds: value.availableLocationIds,
    };

    if (this.data.hourlyWageEnabled && value.hourlyWage != null) {
      payload['hourlyWage'] = value.hourlyWage;
    }

    const req = this.isEdit
      ? this.employeeService.update(this.data.employee!._id, payload)
      : this.employeeService.create(payload);

    req.subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || `Failed to ${this.isEdit ? 'update' : 'add'} employee`;
      },
    });
  }
}
