import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { AuthService, ThemeService } from '../../core/services';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'sb-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule,
  ],
  template: `
    <mat-sidenav-container class="layout-container">
      <mat-sidenav #sidenav [mode]="isHandset() ? 'over' : 'side'"
                   [opened]="isHandset() ? false : desktopNavOpen()" class="sidenav">
        <div class="sidenav-header">
          <mat-icon class="logo-icon">calendar_month</mat-icon>
          <span class="logo-text">ShiftBoard</span>
        </div>
        <mat-nav-list>
          @for (item of visibleNav(); track item.route) {
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link"
               (click)="closeSidenavOnMobile(sidenav)">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="toolbar">
          <button mat-icon-button (click)="toggleNavigation(sidenav)"
                  [attr.aria-label]="desktopNavOpen() ? 'Hide navigation menu' : 'Show navigation menu'">
            <mat-icon>{{ !isHandset() && desktopNavOpen() ? 'menu_open' : 'menu' }}</mat-icon>
          </button>
          <span class="toolbar-spacer"></span>
          <button mat-icon-button (click)="theme.toggle()">
            <mat-icon>{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
            <mat-icon>account_circle</mat-icon>
            @if (user(); as u) {
              <span class="user-name">{{ u.firstName }}</span>
            }
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item routerLink="/settings">
              <mat-icon>settings</mat-icon> Settings
            </button>
            <button mat-menu-item (click)="auth.logout()">
              <mat-icon>logout</mat-icon> Logout
            </button>
          </mat-menu>
        </mat-toolbar>
        <main class="main-content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .layout-container { height: 100vh; }
    .sidenav { width: 260px; background: var(--sb-surface); border-right: 1px solid var(--sb-border); }
    .sidenav-header {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 16px; border-bottom: 1px solid var(--sb-border);
    }
    .logo-icon { color: var(--sb-primary); font-size: 28px; width: 28px; height: 28px; }
    .logo-text { font-size: 1.25rem; font-weight: 700; color: var(--sb-text); }
    .active-link { background: rgba(25, 118, 210, 0.08) !important; color: var(--sb-primary) !important; }
    .toolbar { background: var(--sb-surface); border-bottom: 1px solid var(--sb-border); position: sticky; top: 0; z-index: 10; }
    .toolbar-spacer { flex: 1; }
    .user-menu-btn .user-name { margin-left: 4px; }
    .main-content { background: var(--sb-background); min-height: calc(100vh - 64px); }
    @media (max-width: 768px) { .user-name { display: none; } }
  `],
})
export class MainLayoutComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private breakpoint = inject(BreakpointObserver);
  desktopNavOpen = signal(true);

  isHandset = toSignal(
    this.breakpoint.observe(Breakpoints.Handset).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  user = toSignal(this.auth.currentUser$, { initialValue: null });

  private navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Schedule', icon: 'calendar_month', route: '/schedule' },
    { label: 'Employees', icon: 'people', route: '/employees', roles: ['owner', 'manager'] },
    { label: 'Locations', icon: 'store', route: '/locations', roles: ['owner', 'manager'] },
    { label: 'Settings', icon: 'settings', route: '/settings', roles: ['owner'] },
  ];

  visibleNav = computed(() => {
    const role = this.user()?.role || '';
    return this.navItems.filter((item) => !item.roles || item.roles.includes(role));
  });

  closeSidenavOnMobile(sidenav: MatSidenav): void {
    if (this.isHandset()) sidenav.close();
  }

  toggleNavigation(sidenav: MatSidenav): void {
    if (this.isHandset()) sidenav.toggle();
    else this.desktopNavOpen.update((open) => !open);
  }
}
