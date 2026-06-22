import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Organization } from '../../core/models';

@Component({
  selector: 'sb-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule,
  ],
  template: `
    <div class="sb-page">
      <div class="sb-page-header">
        <h1>Organization Settings</h1>
      </div>

      <div class="tab-content sb-card">
        <form [formGroup]="generalForm" (ngSubmit)="saveGeneral()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Organization Name</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Timezone</mat-label>
            <mat-select formControlName="timezone">
              <mat-option value="America/Toronto">Eastern (Toronto)</mat-option>
              <mat-option value="America/Vancouver">Pacific (Vancouver)</mat-option>
              <mat-option value="America/Edmonton">Mountain (Edmonton)</mat-option>
              <mat-option value="America/Winnipeg">Central (Winnipeg)</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Schedule Start Day</mat-label>
            <mat-select formControlName="scheduleStartDay">
              <mat-option value="monday">Monday</mat-option>
              <mat-option value="tuesday">Tuesday</mat-option>
              <mat-option value="wednesday">Wednesday</mat-option>
              <mat-option value="thursday">Thursday</mat-option>
              <mat-option value="friday">Friday</mat-option>
              <mat-option value="saturday">Saturday</mat-option>
              <mat-option value="sunday">Sunday</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit">Save Settings</button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .tab-content { margin-top: 16px; max-width: 520px; }
    .full-width { width: 100%; }
  `],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  organization: Organization | null = null;

  generalForm = this.fb.group({
    name: [''],
    timezone: ['America/Toronto'],
    scheduleStartDay: ['monday'],
  });

  ngOnInit(): void {
    this.api.get<Organization>('/organization').subscribe((res) => {
      this.organization = res.data;
      this.generalForm.patchValue({
        name: res.data.name,
        timezone: res.data.timezone,
        scheduleStartDay: res.data.scheduleStartDay,
      });
    });
  }

  saveGeneral(): void {
    this.api.put('/organization', this.generalForm.value).subscribe((res) => {
      this.organization = res.data as Organization;
      this.auth.updateOrganization(res.data as Organization);
    });
  }
}
