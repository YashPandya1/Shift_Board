import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStats, isHourlyWageEnabled } from '../../core/models';

@Component({
  selector: 'sb-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, RouterLink, MatIconModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <div class="sb-page">
      <div class="sb-page-header">
        <div>
          <h1>Dashboard</h1>
          @if (stats) {
            <p class="subtitle">Week of {{ stats.weekStart | date:'mediumDate' }} – {{ stats.weekEnd | date:'mediumDate' }}</p>
          }
        </div>
        <button mat-flat-button color="primary" routerLink="/schedule">
          <mat-icon>add</mat-icon> New Schedule
        </button>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner /></div>
      } @else if (stats) {
        <div class="sb-stat-grid">
          <div class="sb-stat-card">
            <span class="stat-label">Total Employees</span>
            <span class="stat-value">{{ stats.totalEmployees }}</span>
            <mat-icon class="stat-icon">people</mat-icon>
          </div>
          <div class="sb-stat-card">
            <span class="stat-label">Active Locations</span>
            <span class="stat-value">{{ stats.activeLocations }}</span>
            <mat-icon class="stat-icon">store</mat-icon>
          </div>
          <div class="sb-stat-card">
            <span class="stat-label">Upcoming Shifts</span>
            <span class="stat-value">{{ stats.upcomingShifts }}</span>
            <mat-icon class="stat-icon">event</mat-icon>
          </div>
          <div class="sb-stat-card">
            <span class="stat-label">Open Shifts</span>
            <span class="stat-value">{{ stats.openShifts }}</span>
            <mat-icon class="stat-icon">work_outline</mat-icon>
          </div>
          <div class="sb-stat-card">
            <span class="stat-label">Hours Scheduled</span>
            <span class="stat-value">{{ stats.hoursScheduled }}h</span>
            <mat-icon class="stat-icon">schedule</mat-icon>
          </div>
          @if (hourlyWageEnabled) {
            <div class="sb-stat-card">
              <span class="stat-label">Labor Cost This Week</span>
              <span class="stat-value">{{ stats.laborCostThisWeek | currency:'CAD':'symbol':'1.0-0' }}</span>
              <mat-icon class="stat-icon">payments</mat-icon>
            </div>
          }
          <div class="sb-stat-card">
            <span class="stat-label">Overtime Hours</span>
            <span class="stat-value" [class.warning]="stats.overtimeHours > 0">{{ stats.overtimeHours }}h</span>
            <mat-icon class="stat-icon">warning</mat-icon>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="sb-card quick-actions">
            <h3>Quick Actions</h3>
            <div class="action-buttons">
              <button mat-stroked-button routerLink="/schedule"><mat-icon>calendar_month</mat-icon> View Schedule</button>
              <button mat-stroked-button routerLink="/employees"><mat-icon>person_add</mat-icon> Add Employee</button>
              <button mat-stroked-button routerLink="/locations"><mat-icon>add_business</mat-icon> Manage Locations</button>
            </div>
          </div>
          @if (hourlyWageEnabled) {
            <div class="sb-card payroll-card">
              <h3>Payroll Estimate</h3>
              <p class="payroll-amount">{{ stats.estimatedPayroll | currency:'CAD':'symbol':'1.0-0' }}</p>
              <p class="payroll-sub">Including overtime adjustments</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .subtitle { color: var(--sb-text-secondary); margin: 4px 0 0; }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .sb-stat-card { position: relative; }
    .warning { color: var(--sb-warning) !important; }
    .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .quick-actions h3, .payroll-card h3 { margin: 0 0 16px; font-size: 1rem; }
    .action-buttons { display: flex; flex-wrap: wrap; gap: 8px;
      button { display: flex; align-items: center; gap: 4px; }
    }
    .payroll-amount { font-size: 2rem; font-weight: 700; margin: 0; color: var(--sb-primary); }
    .payroll-sub { color: var(--sb-text-secondary); margin: 4px 0 0; font-size: 0.875rem; }
    @media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } }
  `],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  stats: DashboardStats | null = null;
  loading = true;
  hourlyWageEnabled = false;

  ngOnInit(): void {
    this.auth.organization$.subscribe((org) => {
      this.hourlyWageEnabled = isHourlyWageEnabled(org);
      this.cdr.markForCheck();
    });
    this.dashboardService.getStats().subscribe({
      next: (res) => { this.stats = res.data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }
}
