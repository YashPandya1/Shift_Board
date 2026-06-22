import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { LocationService } from '../../core/services';
import { Location } from '../../core/models';
import { DAYS, DEFAULT_OPERATING_HOURS, OperatingHours } from '../../core/utils/operating-hours';

@Component({
  selector: 'sb-store-hours-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatSlideToggleModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Store Hours — {{ data.location.name }}</h2>
    <mat-dialog-content>
      <p class="hint">Shifts can only be scheduled during these hours.</p>
      <form [formGroup]="form" class="hours-form">
        @for (day of days; track day.key) {
          <div class="day-row" [formGroupName]="day.key">
            <span class="day-label">{{ day.label }}</span>
            <mat-slide-toggle formControlName="closed" class="closed-toggle">Closed</mat-slide-toggle>
            <mat-form-field appearance="outline" class="time-field">
              <mat-label>Open</mat-label>
              <input matInput type="time" formControlName="open">
            </mat-form-field>
            <mat-form-field appearance="outline" class="time-field">
              <mat-label>Close</mat-label>
              <input matInput type="time" formControlName="close">
            </mat-form-field>
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving">
        Save Hours
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { color: var(--sb-text-secondary); margin: 0 0 16px; font-size: 0.875rem; }
    .hours-form { display: flex; flex-direction: column; gap: 8px; min-width: 400px; }
    .day-row {
      display: grid; grid-template-columns: 100px 80px 1fr 1fr; gap: 8px; align-items: center;
    }
    .day-label { font-weight: 500; font-size: 0.875rem; }
    .time-field { margin: 0; }
    .closed-toggle { font-size: 0.75rem; }
    @media (max-width: 500px) {
      .hours-form { min-width: unset; }
      .day-row { grid-template-columns: 1fr 1fr; }
      .day-label { grid-column: 1 / -1; }
    }
  `],
})
export class StoreHoursDialogComponent {
  data = inject<{ location: Location }>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<StoreHoursDialogComponent>);
  private locationService = inject(LocationService);
  private fb = inject(FormBuilder);

  days = DAYS;
  saving = false;
  form: FormGroup;

  constructor() {
    const hours = { ...DEFAULT_OPERATING_HOURS, ...this.data.location.operatingHours };
    const group: Record<string, FormGroup> = {};
    for (const d of DAYS) {
      group[d.key] = this.fb.group({
        open: [hours[d.key].open],
        close: [hours[d.key].close],
        closed: [hours[d.key].closed],
      });
    }
    this.form = this.fb.group(group);
  }

  save(): void {
    this.saving = true;
    this.locationService.update(this.data.location._id, {
      operatingHours: this.form.value as OperatingHours,
    }).subscribe({
      next: (res) => {
        this.dialogRef.close(res.data);
      },
      error: () => { this.saving = false; },
    });
  }
}
