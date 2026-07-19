import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { EmployeeProfile, Location, Shift, Schedule } from '../models';

export { ApiService } from './api.service';
export { AuthService } from './auth.service';
export { DashboardService } from './dashboard.service';
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private api = inject(ApiService);

  getAll(params?: Record<string, string>): Observable<{ data: EmployeeProfile[] }> {
    return this.api.get<EmployeeProfile[]>('/employees', params);
  }

  getById(id: string): Observable<{ data: { employee: EmployeeProfile } }> {
    return this.api.get(`/employees/${id}`);
  }

  create(data: unknown): Observable<{ data: EmployeeProfile }> {
    return this.api.post<EmployeeProfile>('/employees', data);
  }

  update(id: string, data: unknown): Observable<{ data: EmployeeProfile }> {
    return this.api.put<EmployeeProfile>(`/employees/${id}`, data);
  }

  delete(id: string): Observable<unknown> {
    return this.api.delete(`/employees/${id}`);
  }

  bulkImport(employees: unknown[]): Observable<{ data: unknown }> {
    return this.api.post('/employees/bulk-import', { employees });
  }

  transfer(id: string, locationIds: string[], action = 'add'): Observable<{ data: EmployeeProfile }> {
    return this.api.post<EmployeeProfile>(`/employees/${id}/transfer`, { locationIds, action });
  }
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private api = inject(ApiService);

  getAll(): Observable<{ data: Location[] }> {
    return this.api.get<Location[]>('/locations');
  }

  create(data: unknown): Observable<{ data: Location }> {
    return this.api.post<Location>('/locations', data);
  }

  update(id: string, data: unknown): Observable<{ data: Location }> {
    return this.api.put<Location>(`/locations/${id}`, data);
  }
}

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private api = inject(ApiService);

  getWeek(params: Record<string, string>): Observable<{ data: { shifts: Shift[]; schedules?: Schedule[]; weekStart: string; weekEnd: string; scheduleStartDay?: string; location?: Location } }> {
    return this.api.get('/schedules/week', params);
  }

  create(data: unknown): Observable<{ data: Schedule }> {
    return this.api.post<Schedule>('/schedules', data);
  }

  createShift(data: unknown): Observable<{ data: Shift }> {
    return this.api.post<Shift>('/schedules/shifts', data);
  }

  updateShift(id: string, data: unknown): Observable<{ data: Shift }> {
    return this.api.put<Shift>(`/schedules/shifts/${id}`, data);
  }

  deleteShift(id: string): Observable<unknown> {
    return this.api.delete(`/schedules/shifts/${id}`);
  }

  copyPreviousWeek(
    locationId: string,
    targetWeekStart: string,
    overwrite = false
  ): Observable<{ data: { schedule: Schedule; shifts: Shift[]; shiftsCopied: number } }> {
    return this.api.post('/schedules/copy-week', { locationId, targetWeekStart, overwrite });
  }

  copyDay(
    locationId: string,
    sourceDate: string,
    targetDates: string[],
    overwrite = false
  ): Observable<{ data: {
    schedule: Schedule;
    shifts: Shift[];
    targetDates: string[];
    shiftsCopied: number;
  } }> {
    return this.api.post('/schedules/copy-day', {
      locationId, sourceDate, targetDates, overwrite,
    });
  }

  publish(scheduleId: string): Observable<{ data: Schedule }> {
    return this.api.post<Schedule>(`/schedules/${scheduleId}/publish`, {});
  }

  clearSchedule(params?: Record<string, string>): Observable<{ data: { deletedCount: number } }> {
    return this.api.delete('/schedules/clear-week', params);
  }

  suggestEmployees(params: Record<string, string>): Observable<{ data: unknown[] }> {
    return this.api.get('/schedules/suggest-employees', params);
  }

  exportPDF(scheduleId: string): Observable<Blob> {
    return this.api.getBlob(`/schedules/${scheduleId}/pdf`);
  }

  claimOpenShift(shiftId: string): Observable<{ data: Shift }> {
    return this.api.post<Shift>(`/schedules/shifts/${shiftId}/claim`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);

  getAll(): Observable<{ data: { notifications: unknown[]; unreadCount: number } }> {
    return this.api.get('/notifications');
  }

  markRead(id: string): Observable<unknown> {
    return this.api.put(`/notifications/${id}/read`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private darkMode = false;

  init(): void {
    const stored = localStorage.getItem('darkMode');
    this.darkMode = stored === 'true';
    this.apply();
  }

  toggle(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('darkMode', String(this.darkMode));
    this.apply();
  }

  isDark(): boolean {
    return this.darkMode;
  }

  private apply(): void {
    document.body.classList.toggle('dark-theme', this.darkMode);
  }
}
