import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/schedule/schedule.component').then((m) => m.ScheduleComponent),
      },
      {
        path: 'employees',
        canActivate: [roleGuard('owner', 'manager')],
        loadComponent: () => import('./features/employees/employees.component').then((m) => m.EmployeesComponent),
      },
      {
        path: 'locations',
        canActivate: [roleGuard('owner', 'manager')],
        loadComponent: () => import('./features/locations/locations.component').then((m) => m.LocationsComponent),
      },
      {
        path: 'settings',
        canActivate: [roleGuard('owner')],
        loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
