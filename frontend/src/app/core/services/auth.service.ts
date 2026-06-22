import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse, User, Organization } from '../models';
import { prefetchAppRoutes } from '../utils/route-preload';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private organizationSubject = new BehaviorSubject<Organization | null>(null);
  organization$ = this.organizationSubject.asObservable();

  isAuthenticated = signal(false);
  userRole = computed(() => this.currentUserSubject.value?.role);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    const org = localStorage.getItem('organization');
    if (token && user) {
      const parsed = JSON.parse(user) as User;
      if (!['owner', 'manager'].includes(parsed.role)) {
        this.logout();
        return;
      }
      this.currentUserSubject.next(parsed);
      this.isAuthenticated.set(true);
      if (org) this.organizationSubject.next(JSON.parse(org));
      prefetchAppRoutes();
    }
  }

  login(email: string, password: string): Observable<{ data: AuthResponse }> {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap((res) => this.setSession(res.data))
    );
  }

  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    phone?: string;
  }): Observable<{ data: AuthResponse }> {
    return this.api.post<AuthResponse>('/auth/register', data).pipe(
      tap((res) => this.setSession(res.data))
    );
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.api.post('/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string): Observable<unknown> {
    return this.api.post('/auth/reset-password', { token, password });
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
    this.currentUserSubject.next(null);
    this.organizationSubject.next(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isOwner(): boolean {
    return this.currentUserSubject.value?.role === 'owner';
  }

  isManager(): boolean {
    return ['owner', 'manager'].includes(this.currentUserSubject.value?.role || '');
  }

  isAdmin(): boolean {
    return this.isManager();
  }

  updateOrganization(org: Organization): void {
    localStorage.setItem('organization', JSON.stringify(org));
    this.organizationSubject.next(org);
  }

  private setSession(data: AuthResponse): void {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.organization) {
      localStorage.setItem('organization', JSON.stringify(data.organization));
      this.organizationSubject.next(data.organization);
    }
    this.currentUserSubject.next(data.user);
    this.isAuthenticated.set(true);
    prefetchAppRoutes();
  }
}
