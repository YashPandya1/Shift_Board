import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'sb-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <div class="auth-header">
          <mat-icon class="logo">calendar_month</mat-icon>
          <h1>ShiftBoard</h1>
          <p>Sign in to manage your business schedules</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password">
            <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
              <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>
          @if (error) {
            <p class="error-msg">{{ error }}</p>
          }
          <button mat-flat-button color="primary" class="full-width submit-btn" [disabled]="loading || form.invalid">
            @if (loading) { <mat-spinner diameter="20" /> } @else { Sign In }
          </button>
        </form>
        <div class="auth-links">
          <a routerLink="/auth/forgot-password">Forgot password?</a>
          <a routerLink="/auth/register">Create an account</a>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%);
      padding: 16px;
    }
    .auth-card { width: 100%; max-width: 420px; padding: 32px; border-radius: 16px !important; }
    .auth-header { text-align: center; margin-bottom: 24px;
      .logo { font-size: 48px; width: 48px; height: 48px; color: #1976d2; }
      h1 { margin: 8px 0 4px; font-size: 1.5rem; }
      p { color: #6b7280; margin: 0; }
    }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; font-size: 1rem; margin-top: 8px; }
    .error-msg { color: #ef4444; font-size: 0.875rem; margin: 0 0 8px; }
    .auth-links { display: flex; justify-content: space-between; margin-top: 16px;
      a { color: #1976d2; text-decoration: none; font-size: 0.875rem; }
    }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  hidePassword = true;
  loading = false;
  error = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        if (err.status === 0) {
          this.error = 'Cannot reach the server. Make sure the backend is running (npm run dev:backend).';
        } else {
          this.error = err.error?.message || 'Login failed. Check your email and password.';
        }
        this.loading = false;
      },
    });
  }
}
