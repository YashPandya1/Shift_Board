import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface CopyDayOption {
  date: string;
  label: string;
  shiftCount: number;
}

export interface CopyDayDialogData {
  days: CopyDayOption[];
}

export interface CopyDayDialogResult {
  sourceDate: string;
  targetDates: string[];
  overwrite: boolean;
}

@Component({
  selector: 'sb-copy-day-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Copy a day</h2>
    <mat-dialog-content>
      <p class="description">Choose one scheduled day, then select every day that should use the same shifts.</p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Copy shifts from</mat-label>
        <mat-select [(ngModel)]="sourceDate" (selectionChange)="sourceChanged()">
          @for (day of data.days; track day.date) {
            <mat-option [value]="day.date" [disabled]="day.shiftCount === 0">
              {{ day.label }} ({{ day.shiftCount }} shift{{ day.shiftCount === 1 ? '' : 's' }})
            </mat-option>
          }
        </mat-select>
      </mat-form-field>

      <div class="target-list">
        <span class="target-label">Copy to</span>
        @for (day of data.days; track day.date) {
          @if (day.date !== sourceDate) {
            <mat-checkbox
              [checked]="targetDates.has(day.date)"
              (change)="toggleTarget(day.date, $event.checked)">
              {{ day.label }}
              @if (day.shiftCount) { <span class="existing">({{ day.shiftCount }} existing)</span> }
            </mat-checkbox>
          }
        }
      </div>

      <mat-checkbox [(ngModel)]="overwrite">
        Replace shifts already on selected target days
      </mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary"
              [disabled]="!sourceDate || targetDates.size === 0"
              (click)="copy()">
        Copy Schedule
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .description { color: var(--sb-text-secondary); margin: 0 0 18px; line-height: 1.45; }
    .full-width { width: 100%; }
    .target-list { display: grid; gap: 5px; margin: 2px 0 18px; }
    .target-label { color: var(--sb-text-secondary); font-size: 0.78rem; font-weight: 600; }
    .existing { color: var(--sb-text-secondary); font-size: 0.78rem; }
    mat-dialog-content { min-width: 360px; }
  `],
})
export class CopyDayDialogComponent {
  private dialogRef = inject(MatDialogRef<CopyDayDialogComponent>);
  data = inject<CopyDayDialogData>(MAT_DIALOG_DATA);

  sourceDate = this.data.days.find((day) => day.shiftCount > 0)?.date || '';
  targetDates = new Set<string>();
  overwrite = false;

  sourceChanged(): void {
    this.targetDates.delete(this.sourceDate);
  }

  toggleTarget(date: string, checked: boolean): void {
    if (checked) this.targetDates.add(date);
    else this.targetDates.delete(date);
  }

  copy(): void {
    this.dialogRef.close({
      sourceDate: this.sourceDate,
      targetDates: [...this.targetDates],
      overwrite: this.overwrite,
    } satisfies CopyDayDialogResult);
  }
}
