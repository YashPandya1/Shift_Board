import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { LocationService } from '../../core/services';

@Component({
  selector: 'sb-add-location-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Add Location</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="location-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Location Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Downtown Store" required>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Street Address</mat-label>
          <input matInput formControlName="street">
        </mat-form-field>
        <div class="city-row">
          <mat-form-field appearance="outline">
            <mat-label>City</mat-label>
            <input matInput formControlName="city">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Province</mat-label>
            <input matInput formControlName="province">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone">
        </mat-form-field>
      </form>
      <p class="hint">Default store hours (9 AM – 9 PM) apply. Edit them after creating the location.</p>
      @if (error) {
        <p class="error">{{ error }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || saving" (click)="save()">
        @if (saving) { Saving… } @else { Add Location }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .location-form { display: flex; flex-direction: column; gap: 4px; min-width: 360px; }
    .full-width { width: 100%; }
    .city-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .hint { color: var(--sb-text-secondary); font-size: 0.8rem; margin: 8px 0 0; }
    .error { color: var(--sb-error, #c62828); font-size: 0.875rem; }
  `],
})
export class AddLocationDialogComponent {
  private fb = inject(FormBuilder);
  private locationService = inject(LocationService);
  private dialogRef = inject(MatDialogRef<AddLocationDialogComponent>);

  saving = false;
  error = '';

  form = this.fb.group({
    name: ['', Validators.required],
    street: [''],
    city: [''],
    province: [''],
    phone: [''],
  });

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';

    const v = this.form.getRawValue();
    this.locationService.create({
      name: v.name,
      phone: v.phone || undefined,
      address: {
        street: v.street || undefined,
        city: v.city || undefined,
        province: v.province || undefined,
      },
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || 'Failed to add location';
      },
    });
  }
}
