import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LocationService } from '../../core/services';
import { Location } from '../../core/models';
import { formatHoursSummary } from '../../core/utils/operating-hours';

@Component({
  selector: 'sb-locations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatDialogModule],
  template: `
    <div class="sb-page">
      <div class="sb-page-header">
        <h1>Locations</h1>
        <button mat-flat-button color="primary" (click)="openAddLocation()">
          <mat-icon>add_business</mat-icon> Add Location
        </button>
      </div>

      <div class="location-grid">
        @for (loc of locations; track loc._id) {
          <div class="sb-card location-card">
            <div class="location-header">
              <mat-icon class="loc-icon">store</mat-icon>
              <div>
                <h3>{{ loc.name }}</h3>
                @if (loc.address?.city) {
                  <p>{{ loc.address?.city }}, {{ loc.address?.province }}</p>
                }
              </div>
            </div>
            <div class="hours-row">
              <mat-icon>schedule</mat-icon>
              <span>{{ hoursSummary(loc) }}</span>
            </div>
            @if (loc.managerIds?.length) {
              <div class="managers">
                <span class="label">Managers:</span>
                @for (mgr of loc.managerIds; track mgr._id) {
                  <mat-chip>{{ mgr.firstName }} {{ mgr.lastName }}</mat-chip>
                }
              </div>
            }
            <div class="card-actions">
              <button mat-stroked-button (click)="editHours(loc)">
                <mat-icon>schedule</mat-icon> Store Hours
              </button>
              <button mat-stroked-button routerLink="/schedule">
                <mat-icon>calendar_month</mat-icon> Schedule
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .location-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .location-card { display: flex; flex-direction: column; gap: 12px; }
    .location-header { display: flex; gap: 12px; align-items: flex-start;
      .loc-icon { color: var(--sb-primary); font-size: 32px; width: 32px; height: 32px; }
      h3 { margin: 0; }
      p { margin: 2px 0 0; color: var(--sb-text-secondary); font-size: 0.875rem; }
    }
    .hours-row { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--sb-text-secondary);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .managers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      .label { font-size: 0.8rem; color: var(--sb-text-secondary); }
    }
    .card-actions { display: flex; gap: 8px; margin-top: auto; flex-wrap: wrap; }
  `],
})
export class LocationsComponent implements OnInit {
  private locationService = inject(LocationService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  locations: Location[] = [];

  ngOnInit(): void {
    this.loadLocations();
  }

  loadLocations(): void {
    this.locationService.getAll().subscribe((res) => {
      this.locations = res.data;
      this.cdr.markForCheck();
    });
  }

  openAddLocation(): void {
    import('./add-location-dialog.component').then(({ AddLocationDialogComponent }) => {
      this.dialog.open(AddLocationDialogComponent, { width: '480px' })
        .afterClosed().subscribe((created) => { if (created) this.loadLocations(); });
    });
  }

  hoursSummary(loc: Location): string {
    return formatHoursSummary(loc.operatingHours);
  }

  editHours(loc: Location): void {
    import('./store-hours-dialog.component').then(({ StoreHoursDialogComponent }) => {
      this.dialog.open(StoreHoursDialogComponent, {
        data: { location: loc },
        width: '520px',
      }).afterClosed().subscribe((updated) => {
        if (updated) {
          const idx = this.locations.findIndex((l) => l._id === loc._id);
          if (idx >= 0) this.locations[idx] = updated;
          this.cdr.markForCheck();
        }
      });
    });
  }
}
