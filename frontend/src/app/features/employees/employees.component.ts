import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { CurrencyPipe } from '@angular/common';

import { MatTableModule } from '@angular/material/table';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { MatChipsModule } from '@angular/material/chips';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { MatMenuModule } from '@angular/material/menu';

import { EmployeeService, ScheduleService } from '../../core/services';

import { AuthService } from '../../core/services/auth.service';

import { EmployeeProfile, employeeDisplayName, isHourlyWageEnabled } from '../../core/models';

import { formatSharePhone, buildEmployeeScheduleMessage } from '../../core/utils/schedule-utils';



@Component({

  selector: 'sb-employees',

  standalone: true,

  changeDetection: ChangeDetectionStrategy.OnPush,

  imports: [

    CurrencyPipe, MatTableModule, MatButtonModule, MatIconModule,

    MatChipsModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatMenuModule,

  ],

  template: `

    <div class="sb-page">

      <div class="sb-page-header">

        <h1>Employees</h1>

        <div class="header-actions">

          <button mat-stroked-button><mat-icon>upload_file</mat-icon> Import CSV</button>

          <button mat-flat-button color="primary" (click)="openAddEmployee()">

            <mat-icon>person_add</mat-icon> Add Employee

          </button>

        </div>

      </div>



      <mat-form-field appearance="outline" class="search-field">

        <mat-label>Search employees</mat-label>

        <mat-icon matPrefix>search</mat-icon>

        <input matInput (input)="onSearch($event)">

      </mat-form-field>



      <div class="sb-card table-container">

        <table mat-table [dataSource]="filteredEmployees" class="employee-table">

          <ng-container matColumnDef="name">

            <th mat-header-cell *matHeaderCellDef>Name</th>

            <td mat-cell *matCellDef="let emp">

              <div class="emp-name-row">

                <div class="emp-name">

                  <strong>{{ displayName(emp) }}</strong>

                  @if (emp.phone) {

                    <span class="email">{{ emp.phone }}</span>

                  }

                </div>

                <button mat-icon-button class="share-btn" [matMenuTriggerFor]="shareMenu"

                        (click)="prepareShare(emp)" aria-label="Share schedule">

                  <mat-icon>share</mat-icon>

                </button>

              </div>

            </td>

          </ng-container>

          <ng-container matColumnDef="position">

            <th mat-header-cell *matHeaderCellDef>Position</th>

            <td mat-cell *matCellDef="let emp">{{ emp.position || '—' }}</td>

          </ng-container>

          @if (hourlyWageEnabled) {

            <ng-container matColumnDef="wage">

              <th mat-header-cell *matHeaderCellDef>Hourly Wage</th>

              <td mat-cell *matCellDef="let emp">

                @if (emp.hourlyWage) {

                  {{ emp.hourlyWage | currency:'CAD' }}/hr

                } @else {

                  —

                }

              </td>

            </ng-container>

          }

          <ng-container matColumnDef="hours">

            <th mat-header-cell *matHeaderCellDef>Hours This Week</th>

            <td mat-cell *matCellDef="let emp">{{ emp.hoursThisWeek ?? 0 }}h</td>

          </ng-container>

          <ng-container matColumnDef="locations">

            <th mat-header-cell *matHeaderCellDef>Locations</th>

            <td mat-cell *matCellDef="let emp">

              @for (loc of emp.availableLocationIds; track loc._id) {

                <mat-chip>{{ loc.name }}</mat-chip>

              }

            </td>

          </ng-container>

          <ng-container matColumnDef="status">

            <th mat-header-cell *matHeaderCellDef>Status</th>

            <td mat-cell *matCellDef="let emp">

              <span class="status-badge" [class]="emp.employmentStatus">{{ emp.employmentStatus }}</span>

            </td>

          </ng-container>

          <ng-container matColumnDef="actions">

            <th mat-header-cell *matHeaderCellDef></th>

            <td mat-cell *matCellDef="let emp">

              <button mat-icon-button (click)="openEditEmployee(emp)"><mat-icon>edit</mat-icon></button>

              @if (!isOwnerProfile(emp)) {

                <button mat-icon-button (click)="deleteEmployee(emp)" aria-label="Delete employee">

                  <mat-icon>delete</mat-icon>

                </button>

              }

            </td>

          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>

          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

        </table>

      </div>

      <mat-menu #shareMenu="matMenu">

        @if (shareEmployee) {

          <button mat-menu-item (click)="shareSms()" [disabled]="shareLoading">

            <mat-icon>sms</mat-icon> Text Message

          </button>

          <button mat-menu-item (click)="shareWhatsApp()" [disabled]="shareLoading">

            <mat-icon>chat</mat-icon> WhatsApp

          </button>

          <button mat-menu-item (click)="copyShareText()" [disabled]="shareLoading">

            <mat-icon>content_copy</mat-icon> Copy Text

          </button>

        }

      </mat-menu>

    </div>

  `,

  styles: [`

    .header-actions { display: flex; gap: 8px; }

    .search-field { width: 100%; max-width: 400px; margin-bottom: 16px; }

    .table-container { overflow-x: auto; padding: 0; }

    .employee-table { width: 100%; }

    .emp-name-row { display: flex; align-items: center; gap: 4px; }

    .emp-name { display: flex; flex-direction: column;

      .email { font-size: 0.8rem; color: var(--sb-text-secondary); }

    }

    .share-btn { flex-shrink: 0;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }

    }

    .status-badge {

      padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize;

      &.active { background: #d1fae5; color: #065f46; }

      &.inactive { background: #fee2e2; color: #991b1b; }

      &.on_leave { background: #fef3c7; color: #92400e; }

    }

    mat-chip { font-size: 0.75rem; }

  `],

})

export class EmployeesComponent implements OnInit {

  private employeeService = inject(EmployeeService);

  private scheduleService = inject(ScheduleService);

  private auth = inject(AuthService);

  private dialog = inject(MatDialog);

  private cdr = inject(ChangeDetectorRef);



  employees: EmployeeProfile[] = [];

  filteredEmployees: EmployeeProfile[] = [];

  hourlyWageEnabled = false;

  shareEmployee: EmployeeProfile | null = null;

  shareLoading = false;

  private shareText = '';



  get displayedColumns(): string[] {

    const cols = ['name', 'position'];

    if (this.hourlyWageEnabled) cols.push('wage');

    cols.push('hours', 'locations', 'status', 'actions');

    return cols;

  }



  ngOnInit(): void {

    this.auth.organization$.subscribe((org) => {

      this.hourlyWageEnabled = isHourlyWageEnabled(org);

      this.cdr.markForCheck();

    });

    this.loadEmployees();

  }



  loadEmployees(): void {

    this.employeeService.getAll({ status: 'active' }).subscribe((res) => {

      this.employees = res.data;

      this.filteredEmployees = res.data;

      this.cdr.markForCheck();

    });

  }



  openAddEmployee(): void {

    import('./employee-dialog.component').then(({ EmployeeDialogComponent }) => {

      this.dialog.open(EmployeeDialogComponent, {

        width: '480px',

        data: { hourlyWageEnabled: this.hourlyWageEnabled },

      }).afterClosed().subscribe((created) => {

        if (created) this.loadEmployees();

      });

    });

  }



  openEditEmployee(emp: EmployeeProfile): void {

    import('./employee-dialog.component').then(({ EmployeeDialogComponent }) => {

      this.dialog.open(EmployeeDialogComponent, {

        width: '480px',

        data: { hourlyWageEnabled: this.hourlyWageEnabled, employee: emp },

      }).afterClosed().subscribe((saved) => {

        if (saved) this.loadEmployees();

      });

    });

  }



  onSearch(event: Event): void {

    const term = (event.target as HTMLInputElement).value.toLowerCase();

    this.filteredEmployees = this.employees.filter((e) =>

      this.displayName(e).toLowerCase().includes(term) ||

      (e.phone || '').toLowerCase().includes(term)

    );

    this.cdr.markForCheck();

  }



  displayName(emp: EmployeeProfile): string {

    return employeeDisplayName(emp, emp.userId);

  }



  isOwnerProfile(emp: EmployeeProfile): boolean {

    return typeof emp.userId === 'object' && emp.userId?.role === 'owner';

  }



  deleteEmployee(emp: EmployeeProfile): void {

    if (!confirm(`Remove ${this.displayName(emp)}? They will no longer appear on the schedule.`)) return;

    this.employeeService.delete(emp._id).subscribe({

      next: () => this.loadEmployees(),

      error: (err) => alert(err.error?.message || 'Failed to delete employee'),

    });

  }



  prepareShare(emp: EmployeeProfile): void {

    this.shareEmployee = emp;

    this.shareLoading = true;

    this.shareText = '';

    this.scheduleService.getWeek({

      view: 'employee',

      employeeId: emp._id,

      date: new Date().toISOString(),

    }).subscribe({

      next: (res) => {

        const start = new Date(res.data.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const end = new Date(res.data.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const weekLabel = `${start} – ${end}`;

        const locNames = [...new Set(

          res.data.shifts

            .map((s) => (typeof s.locationId === 'object' ? s.locationId?.name : null))

            .filter(Boolean) as string[],

        )];

        const locationName = locNames.length === 1

          ? locNames[0]

          : locNames.length > 1

            ? locNames.join(', ')

            : emp.availableLocationIds?.[0]?.name || 'your location';

        this.shareText = buildEmployeeScheduleMessage(

          this.displayName(emp),

          locationName,

          weekLabel,

          res.data.shifts.map((s) => ({

            date: s.date,

            startTime: s.startTime,

            endTime: s.endTime,

            totalHours: s.totalHours,

          })),

        );

        this.shareLoading = false;

        this.cdr.markForCheck();

      },

      error: () => {

        this.shareLoading = false;

        this.shareText = buildEmployeeScheduleMessage(

          this.displayName(emp), 'your location', 'this week', [],

        );

        this.cdr.markForCheck();

      },

    });

  }



  shareSms(): void {

    if (!this.shareEmployee || this.shareLoading) return;

    const phone = formatSharePhone(this.shareEmployee.phone);

    if (!phone) {

      alert('No phone number on file. Add one when editing this employee.');

      return;

    }

    window.location.href = `sms:${phone}?body=${encodeURIComponent(this.shareText)}`;

  }



  shareWhatsApp(): void {

    if (!this.shareEmployee || this.shareLoading) return;

    const phone = formatSharePhone(this.shareEmployee.phone);

    if (!phone) {

      alert('No phone number on file. Add one when editing this employee.');

      return;

    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(this.shareText)}`, '_blank');

  }



  copyShareText(): void {

    if (!this.shareText || this.shareLoading) return;

    navigator.clipboard.writeText(this.shareText);

  }

}


