import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DashboardStats } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(ApiService);

  getStats(): Observable<{ data: DashboardStats }> {
    return this.api.get<DashboardStats>('/dashboard');
  }

  getLaborCostReport(params: Record<string, string>): Observable<{ data: unknown }> {
    return this.api.get('/reports/labor-cost', params);
  }

  getAnnouncements(): Observable<{ data: unknown[] }> {
    return this.api.get('/announcements');
  }
}
